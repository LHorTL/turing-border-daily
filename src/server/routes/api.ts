import { Hono } from 'hono';
import { BORDER_MANUAL } from '../../shared/rules';
import type {
  ArchiveDateSummary,
  DailyPayload,
  RuleCode,
  SplashPayload,
  VerdictDecision,
} from '../../shared/types';
import {
  generateDailyCase,
  getAllowedPracticeDates,
  getCaseNumber,
  getUtcDateStr,
  isValidDateStr,
  redactCaseForClient,
} from '../core/caseGenerator';
import {
  applyConfrontCitation,
  applyCountermoveAction,
  applyProbe,
  computeVerdictScore,
  createInitialSession,
  evaluateVerdict,
  toPublicSession,
} from '../core/interrogation';
import {
  loadCommunityStats,
  loadSession,
  loadUserStats,
  recordDailyCommunityVote,
  resolveUserIdentity,
  saveSession,
  updateUserStatsOnDailySolve,
  type AppRuntime,
} from '../core/store';

function resolveTargetDate(rawDate: string | undefined, todayStr: string): {
  dateStr: string;
  isPractice: boolean;
  error?: string;
} {
  if (!rawDate || rawDate === todayStr) {
    return { dateStr: todayStr, isPractice: false };
  }
  if (!isValidDateStr(rawDate)) {
    return { dateStr: todayStr, isPractice: false, error: 'Invalid date format (YYYY-MM-DD).' };
  }
  const allowed = getAllowedPracticeDates(todayStr);
  if (!allowed.includes(rawDate)) {
    return {
      dateStr: todayStr,
      isPractice: false,
      error: 'Date outside allowed window (today or past 7 archive days).',
    };
  }
  return { dateStr: rawDate, isPractice: rawDate !== todayStr };
}

export function createApiRouter(runtime: AppRuntime): Hono {
  const api = new Hono();
  const getToday = () => getUtcDateStr(runtime.now ? runtime.now() : new Date());

  api.get('/splash', async (c) => {
    const todayStr = getToday();
    const { userKey, username } = await resolveUserIdentity(runtime);
    const secret = generateDailyCase(todayStr);
    const publicCase = redactCaseForClient(secret);

    const [community, userStats, existingSession] = await Promise.all([
      loadCommunityStats(runtime.redis, todayStr),
      loadUserStats(runtime.redis, userKey, username),
      loadSession(runtime.redis, userKey, todayStr),
    ]);

    const excerpt =
      publicCase.openingLine.length > 104
        ? `${publicCase.openingLine.slice(0, 102).replace(/\s+\S*$/, '')}...`
        : publicCase.openingLine;

    const payload: SplashPayload = {
      dateStr: todayStr,
      caseNumber: publicCase.caseNumber,
      ticketCode: publicCase.ticketCode,
      suspectName: publicCase.name,
      suspectRole: publicCase.role,
      passId: publicCase.passId,
      openingExcerpt: excerpt,
      avatar: publicCase.avatar,
      community,
      userStats,
      solvedToday: Boolean(existingSession?.solved),
      todayGrade: existingSession?.verdict?.grade,
    };

    return c.json(payload);
  });

  api.get('/daily', async (c) => {
    const todayStr = getToday();
    const resolved = resolveTargetDate(c.req.query('date'), todayStr);
    if (resolved.error) {
      return c.json({ error: resolved.error }, 400);
    }

    const { dateStr, isPractice } = resolved;
    const { userKey, username } = await resolveUserIdentity(runtime);
    const secret = generateDailyCase(dateStr);
    const publicCase = redactCaseForClient(secret);

    let session = await loadSession(runtime.redis, userKey, dateStr);
    if (!session) {
      session = createInitialSession(secret);
      await saveSession(runtime.redis, userKey, dateStr, session);
    }

    const allowedDates = getAllowedPracticeDates(todayStr);
    const [community, userStats, archiveSessions] = await Promise.all([
      loadCommunityStats(runtime.redis, dateStr),
      loadUserStats(runtime.redis, userKey, username),
      Promise.all(allowedDates.map((d) => loadSession(runtime.redis, userKey, d))),
    ]);

    const archiveDates: ArchiveDateSummary[] = allowedDates.map((d, idx) => {
      const s = archiveSessions[idx];
      return {
        dateStr: d,
        caseNumber: getCaseNumber(d),
        isToday: d === todayStr,
        solved: Boolean(s?.solved),
        grade: s?.verdict?.grade,
      };
    });

    const payload: DailyPayload = {
      dateStr,
      todayStr,
      isPractice,
      caseNumber: publicCase.caseNumber,
      suspect: publicCase,
      rules: BORDER_MANUAL,
      session: toPublicSession(session, secret),
      community,
      userStats,
      archiveDates,
    };

    return c.json(payload);
  });

  api.post('/probe', async (c) => {
    const todayStr = getToday();
    let body: { dateStr?: string; question?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON payload.' }, 400);
    }

    const resolved = resolveTargetDate(body.dateStr, todayStr);
    if (resolved.error) return c.json({ error: resolved.error }, 400);

    const { dateStr } = resolved;
    const { userKey } = await resolveUserIdentity(runtime);
    const secret = generateDailyCase(dateStr);

    const session = (await loadSession(runtime.redis, userKey, dateStr)) ?? createInitialSession(secret);
    const outcome = applyProbe(session, secret, body.question ?? '');
    if (outcome.error) {
      return c.json({ error: outcome.error }, 400);
    }

    await saveSession(runtime.redis, userKey, dateStr, session);
    return c.json({
      reply: outcome.reply,
      countermove: outcome.countermove ?? null,
      session: toPublicSession(session, secret),
    });
  });

  api.post('/confront', async (c) => {
    const todayStr = getToday();
    let body: { dateStr?: string; fieldId?: string; ruleCode?: RuleCode } = {};
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON payload.' }, 400);
    }

    const resolved = resolveTargetDate(body.dateStr, todayStr);
    if (resolved.error) return c.json({ error: resolved.error }, 400);

    const { dateStr } = resolved;
    const { userKey } = await resolveUserIdentity(runtime);
    const secret = generateDailyCase(dateStr);

    const session = (await loadSession(runtime.redis, userKey, dateStr)) ?? createInitialSession(secret);
    const outcome = applyConfrontCitation(
      session,
      secret,
      body.fieldId ?? '',
      (body.ruleCode ?? '') as RuleCode
    );
    if (outcome.error) {
      return c.json({ error: outcome.error }, 400);
    }

    await saveSession(runtime.redis, userKey, dateStr, session);
    return c.json({
      citation: outcome.citation,
      session: toPublicSession(session, secret),
    });
  });

  api.post('/countermove', async (c) => {
    const todayStr = getToday();
    let body: {
      dateStr?: string;
      action?: 'ACTIVATE_SHIELD' | 'REJECT_BRIBE' | 'ACCEPT_BRIBE';
    } = {};
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON payload.' }, 400);
    }

    const resolved = resolveTargetDate(body.dateStr, todayStr);
    if (resolved.error) return c.json({ error: resolved.error }, 400);

    if (
      body.action !== 'ACTIVATE_SHIELD' &&
      body.action !== 'REJECT_BRIBE' &&
      body.action !== 'ACCEPT_BRIBE'
    ) {
      return c.json({ error: 'Invalid countermove action.' }, 400);
    }

    const { dateStr } = resolved;
    const { userKey } = await resolveUserIdentity(runtime);
    const secret = generateDailyCase(dateStr);

    const session = (await loadSession(runtime.redis, userKey, dateStr)) ?? createInitialSession(secret);
    const outcome = applyCountermoveAction(session, body.action);
    if (outcome.error) {
      return c.json({ error: outcome.error }, 400);
    }

    await saveSession(runtime.redis, userKey, dateStr, session);
    return c.json({
      message: outcome.message,
      session: toPublicSession(session, secret),
    });
  });

  api.post('/verdict', async (c) => {
    const todayStr = getToday();
    let body: { dateStr?: string; decision?: VerdictDecision } = {};
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON payload.' }, 400);
    }

    if (body.decision !== 'PASS' && body.decision !== 'PURGE') {
      return c.json({ error: 'Decision must be PASS or PURGE.' }, 400);
    }

    const resolved = resolveTargetDate(body.dateStr, todayStr);
    if (resolved.error) return c.json({ error: resolved.error }, 400);

    const { dateStr, isPractice } = resolved;
    const { userKey, username } = await resolveUserIdentity(runtime);
    const secret = generateDailyCase(dateStr);

    const session = (await loadSession(runtime.redis, userKey, dateStr)) ?? createInitialSession(secret);

    // Idempotent Daily Solve Lock: never double-count Redis votes or streak!
    if (session.solved && session.verdict) {
      const [community, userStats] = await Promise.all([
        loadCommunityStats(runtime.redis, dateStr),
        loadUserStats(runtime.redis, userKey, username),
      ]);
      return c.json({
        alreadySolved: true,
        verdict: session.verdict,
        session: toPublicSession(session, secret),
        community,
        userStats,
      });
    }

    const { correct, score } = computeVerdictScore(session, secret, body.decision);

    let community;
    let userStats;
    let percentile: number;

    if (!isPractice) {
      const voteRes = await recordDailyCommunityVote(
        runtime.redis,
        dateStr,
        body.decision,
        correct,
        score
      );
      community = voteRes.community;
      percentile = voteRes.percentile;
      userStats = await updateUserStatsOnDailySolve(
        runtime.redis,
        userKey,
        username,
        dateStr,
        correct
      );
    } else {
      community = await loadCommunityStats(runtime.redis, dateStr);
      userStats = await loadUserStats(runtime.redis, userKey, username);
      percentile = Math.max(5, 100 - score);
    }

    const verdict = evaluateVerdict(
      session,
      secret,
      body.decision,
      percentile,
      userStats.streak,
      isPractice
    );

    await saveSession(runtime.redis, userKey, dateStr, session);

    return c.json({
      alreadySolved: false,
      verdict,
      session: toPublicSession(session, secret),
      community,
      userStats,
    });
  });

  api.post('/share-comment', async (c) => {
    const todayStr = getToday();
    let body: { dateStr?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const resolved = resolveTargetDate(body.dateStr, todayStr);
    if (resolved.error) return c.json({ error: resolved.error }, 400);

    const { dateStr } = resolved;
    const { userKey } = await resolveUserIdentity(runtime);
    const session = await loadSession(runtime.redis, userKey, dateStr);

    if (!session || !session.solved || !session.verdict) {
      return c.json({ error: 'Complete your inspection verdict before sharing a receipt.' }, 400);
    }

    if (session.verdict.commentShared) {
      return c.json({
        shared: true,
        alreadyShared: true,
        commentId: session.verdict.sharedCommentId,
        receiptText: session.verdict.receiptText,
      });
    }

    const postId = runtime.getContext().postId;
    if (!postId) {
      return c.json({
        shared: false,
        fallbackCopyOnly: true,
        message: 'No active Reddit thread detected — copy your spoiler-free receipt below.',
        receiptText: session.verdict.receiptText,
      });
    }

    try {
      const comment = await runtime.reddit.submitComment({
        id: postId,
        text: session.verdict.receiptText,
      });
      session.verdict.commentShared = true;
      session.verdict.sharedCommentId = comment.id;
      await saveSession(runtime.redis, userKey, dateStr, session);

      return c.json({
        shared: true,
        alreadyShared: false,
        commentId: comment.id,
        receiptText: session.verdict.receiptText,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unable to submit Reddit comment.';
      return c.json(
        {
          shared: false,
          fallbackCopyOnly: true,
          message: detail,
          receiptText: session.verdict.receiptText,
        },
        200
      );
    }
  });

  api.post('/reset-practice', async (c) => {
    const todayStr = getToday();
    let body: { dateStr?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON payload.' }, 400);
    }

    const resolved = resolveTargetDate(body.dateStr, todayStr);
    if (resolved.error) return c.json({ error: resolved.error }, 400);
    if (!resolved.isPractice) {
      return c.json({ error: 'Today’s live Daily Check is locked and cannot be reset.' }, 403);
    }

    const { dateStr } = resolved;
    const { userKey } = await resolveUserIdentity(runtime);
    const secret = generateDailyCase(dateStr);
    const fresh = createInitialSession(secret);
    await saveSession(runtime.redis, userKey, dateStr, fresh);

    return c.json({
      reset: true,
      session: toPublicSession(fresh, secret),
    });
  });

  return api;
}
