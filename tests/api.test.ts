import { describe, expect, it } from 'vitest';
import { createApiRouter } from '../src/server/routes/api';
import { generateDailyCase } from '../src/server/core/caseGenerator';
import type { AppRuntime } from '../src/server/core/store';

function createTestRuntime(fixedDateIso = '2026-11-24T12:00:00Z') {
  const kv = new Map<string, string>();
  const submittedComments: Array<{ id: string; text: string }> = [];

  const runtime: AppRuntime = {
    redis: {
      // Strictly returns undefined on cold-start missing keys (Devvit Redis contract)
      async get(key: string) {
        return kv.has(key) ? kv.get(key) : undefined;
      },
      async set(key: string, value: string) {
        kv.set(key, String(value));
        return 'OK';
      },
      async incrBy(key: string, delta: number) {
        const cur = kv.has(key) ? Number.parseInt(kv.get(key)!, 10) || 0 : 0;
        const next = cur + delta;
        kv.set(key, String(next));
        return next;
      },
    },
    reddit: {
      async getCurrentUsername() {
        return 'inspector_test';
      },
      async submitComment(opts) {
        submittedComments.push(opts);
        return { id: `t1_comment_${submittedComments.length}` };
      },
      async submitCustomPost(opts) {
        return { id: `t3_post_${opts.title.length}` };
      },
    },
    getContext: () => ({
      postId: 't3_daily_post_1',
      subredditName: 'r/TuringBorderTest',
      userId: 't2_user_42',
      username: 'inspector_test',
    }),
    now: () => new Date(fixedDateIso),
  };

  return { app: createApiRouter(runtime), kv, submittedComments };
}

describe('Devvit Hono API routes (cold start, Fog-of-War, idempotency, archive isolation)', () => {
  it('handles cold-start undefined Redis keys cleanly on /splash and /daily with zero spoilers', async () => {
    const { app } = createTestRuntime('2026-11-24T12:00:00Z');
    const secret = generateDailyCase('2026-11-24');

    const splashRes = await app.request('/splash');
    expect(splashRes.status).toBe(200);
    const splash = await splashRes.json();
    expect(splash.dateStr).toBe('2026-11-24');
    expect(splash.community.total).toBe(0);
    expect(splash.userStats.streak).toBe(0);
    expect(JSON.stringify(splash)).not.toContain(secret.trueId);

    const dailyRes = await app.request('/daily');
    expect(dailyRes.status).toBe(200);
    const daily = await dailyRes.json();
    expect(daily.isPractice).toBe(false);
    expect(daily.archiveDates.length).toBe(8); // Today + past 7 days
    expect(daily.session.probesLeft).toBe(4);
    expect(daily.session.solved).toBe(false);

    const rawDaily = JSON.stringify(daily);
    expect(rawDaily).not.toContain(secret.trueId);
    expect(rawDaily).not.toContain('"isSynth"');
    expect(rawDaily).not.toContain('"truthSummary"');
  });

  it('enforces idempotent daily solve lock and idempotent Reddit comment sharing', async () => {
    const { app, submittedComments } = createTestRuntime('2026-11-24T12:00:00Z');
    const secret = generateDailyCase('2026-11-24');

    // Probe once and confirm zero spoiler leak on /probe
    const probeRes = await app.request('/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateStr: '2026-11-24', question: 'Explain your permit dates.' }),
    });
    expect(probeRes.status).toBe(200);
    const probeJson = await probeRes.json();
    expect(probeJson.session.probesLeft).toBe(3);
    expect(JSON.stringify(probeJson)).not.toContain(secret.trueId);
    expect(JSON.stringify(probeJson)).not.toContain('"isSynth"');

    // Submit verdict #1
    const correctDecision = secret.isSynth ? 'PURGE' : 'PASS';
    const v1Res = await app.request('/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateStr: '2026-11-24', decision: correctDecision }),
    });
    expect(v1Res.status).toBe(200);
    const v1 = await v1Res.json();
    expect(v1.alreadySolved).toBe(false);
    expect(v1.verdict.correct).toBe(true);
    expect(v1.verdict.xray.trueId).toBe(secret.trueId);
    expect(v1.community.total).toBe(1);
    expect(v1.userStats.streak).toBe(1);

    // Submit verdict #2 (attempt double vote with opposite decision!)
    const opposite = correctDecision === 'PURGE' ? 'PASS' : 'PURGE';
    const v2Res = await app.request('/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateStr: '2026-11-24', decision: opposite }),
    });
    expect(v2Res.status).toBe(200);
    const v2 = await v2Res.json();
    expect(v2.alreadySolved).toBe(true);
    expect(v2.verdict.decision).toBe(correctDecision);
    expect(v2.community.total).toBe(1); // Strictly NOT incremented!
    expect(v2.userStats.streak).toBe(1);

    // Share comment #1 -> posts via reddit.submitComment
    const s1Res = await app.request('/share-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateStr: '2026-11-24' }),
    });
    expect(s1Res.status).toBe(200);
    const s1 = await s1Res.json();
    expect(s1.shared).toBe(true);
    expect(s1.alreadyShared).toBe(false);
    expect(submittedComments.length).toBe(1);
    expect(submittedComments[0]!.id).toBe('t3_daily_post_1');
    expect(submittedComments[0]!.text).not.toContain(secret.trueId);

    // Share comment #2 -> idempotent, zero duplicate Reddit spam!
    const s2Res = await app.request('/share-comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateStr: '2026-11-24' }),
    });
    expect(s2Res.status).toBe(200);
    const s2 = await s2Res.json();
    expect(s2.alreadyShared).toBe(true);
    expect(submittedComments.length).toBe(1);
  });

  it('isolates Practice Archive from live daily stats and forbids resetting today', async () => {
    const { app } = createTestRuntime('2026-11-24T12:00:00Z');

    // Load yesterday's archive case (2026-11-23)
    const archRes = await app.request('/daily?date=2026-11-23');
    expect(archRes.status).toBe(200);
    const arch = await archRes.json();
    expect(arch.isPractice).toBe(true);

    // Solve archive case -> must NOT change today's community stats or user daily streak
    const vRes = await app.request('/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateStr: '2026-11-23', decision: 'PASS' }),
    });
    expect(vRes.status).toBe(200);
    const vJson = await vRes.json();
    expect(vJson.userStats.streak).toBe(0);
    expect(vJson.community.total).toBe(0);

    // Archive reset allowed
    const resetArch = await app.request('/reset-practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateStr: '2026-11-23' }),
    });
    expect(resetArch.status).toBe(200);
    const resetJson = await resetArch.json();
    expect(resetJson.session.solved).toBe(false);

    // Today's live check reset forbidden
    const resetToday = await app.request('/reset-practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateStr: '2026-11-24' }),
    });
    expect(resetToday.status).toBe(403);
  });
});
