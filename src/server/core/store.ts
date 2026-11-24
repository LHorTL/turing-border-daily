import type { CommunityStats, UserStats } from '../../shared/types';
import type { ServerSessionRecord } from './interrogation';
import { shiftUtcDate } from './caseGenerator';

export interface RedisLike {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<unknown>;
  incrBy(key: string, value: number): Promise<number>;
}

export interface RedditLike {
  getCurrentUsername(): Promise<string | undefined>;
  submitComment(opts: { id: string; text: string }): Promise<{ id: string }>;
  submitCustomPost(opts: { title: string }): Promise<{ id: string }>;
}

export interface RequestContext {
  postId?: string;
  subredditName?: string;
  userId?: string;
  username?: string;
}

export interface AppRuntime {
  redis: RedisLike;
  reddit: RedditLike;
  getContext(): RequestContext;
  now?: () => Date;
}

function parseIntSafe(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

function sessionKey(userKey: string, dateStr: string): string {
  return `tb:v1:session:${userKey}:${dateStr}`;
}

function userStatsKey(userKey: string): string {
  return `tb:v1:user:${userKey}:stats`;
}

function dailyKey(dateStr: string, metric: string): string {
  return `tb:v1:daily:${dateStr}:${metric}`;
}

export async function resolveUserIdentity(
  runtime: AppRuntime
): Promise<{ userKey: string; username: string }> {
  const ctx = runtime.getContext();
  let username = ctx.username;
  if (!username) {
    try {
      username = await runtime.reddit.getCurrentUsername();
    } catch {
      username = undefined;
    }
  }
  const cleanName = username?.trim() || 'inspector';
  const userKey = (ctx.userId?.trim() || cleanName).replace(/[^a-zA-Z0-9_-]/g, '_');
  return { userKey, username: cleanName };
}

export async function loadSession(
  redis: RedisLike,
  userKey: string,
  dateStr: string
): Promise<ServerSessionRecord | null> {
  const raw = await redis.get(sessionKey(userKey, dateStr));
  if (raw === undefined || raw === '') return null;
  try {
    return JSON.parse(raw) as ServerSessionRecord;
  } catch {
    return null;
  }
}

export async function saveSession(
  redis: RedisLike,
  userKey: string,
  dateStr: string,
  session: ServerSessionRecord
): Promise<void> {
  await redis.set(sessionKey(userKey, dateStr), JSON.stringify(session));
}

export async function loadUserStats(
  redis: RedisLike,
  userKey: string,
  username: string
): Promise<UserStats> {
  const raw = await redis.get(userStatsKey(userKey));
  if (raw === undefined || raw === '') {
    return {
      username,
      streak: 0,
      bestStreak: 0,
      solvedCount: 0,
      correctCount: 0,
      lastSolvedDate: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<UserStats>;
    return {
      username,
      streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
      bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
      solvedCount: typeof parsed.solvedCount === 'number' ? parsed.solvedCount : 0,
      correctCount: typeof parsed.correctCount === 'number' ? parsed.correctCount : 0,
      lastSolvedDate: typeof parsed.lastSolvedDate === 'string' ? parsed.lastSolvedDate : null,
    };
  } catch {
    return {
      username,
      streak: 0,
      bestStreak: 0,
      solvedCount: 0,
      correctCount: 0,
      lastSolvedDate: null,
    };
  }
}

export async function updateUserStatsOnDailySolve(
  redis: RedisLike,
  userKey: string,
  username: string,
  dateStr: string,
  correct: boolean
): Promise<UserStats> {
  const stats = await loadUserStats(redis, userKey, username);

  if (stats.lastSolvedDate !== dateStr) {
    const yesterday = shiftUtcDate(dateStr, -1);
    const nextStreak = stats.lastSolvedDate === yesterday ? stats.streak + 1 : 1;
    stats.streak = nextStreak;
    stats.bestStreak = Math.max(stats.bestStreak, nextStreak);
    stats.solvedCount += 1;
    if (correct) stats.correctCount += 1;
    stats.lastSolvedDate = dateStr;
    await redis.set(userStatsKey(userKey), JSON.stringify(stats));
  }

  return stats;
}

export async function loadCommunityStats(
  redis: RedisLike,
  dateStr: string
): Promise<CommunityStats> {
  const [totalRaw, passRaw, purgeRaw, correctRaw] = await Promise.all([
    redis.get(dailyKey(dateStr, 'total')),
    redis.get(dailyKey(dateStr, 'pass')),
    redis.get(dailyKey(dateStr, 'purge')),
    redis.get(dailyKey(dateStr, 'correct')),
  ]);

  const total = parseIntSafe(totalRaw);
  const passCount = parseIntSafe(passRaw);
  const purgeCount = parseIntSafe(purgeRaw);
  const correctCount = parseIntSafe(correctRaw);

  if (total === 0) {
    return {
      total: 0,
      passCount: 0,
      purgeCount: 0,
      passPct: 0,
      purgePct: 0,
      accuracyPct: 0,
    };
  }

  const purgePct = Math.round((purgeCount / total) * 100);
  const passPct = 100 - purgePct;
  const accuracyPct = Math.round((correctCount / total) * 100);

  return {
    total,
    passCount,
    purgeCount,
    passPct,
    purgePct,
    accuracyPct,
  };
}

function scoreToBucket(score: number): number {
  return Math.max(0, Math.min(10, Math.floor(score / 10)));
}

export async function recordDailyCommunityVote(
  redis: RedisLike,
  dateStr: string,
  decision: 'PASS' | 'PURGE',
  correct: boolean,
  score: number
): Promise<{ community: CommunityStats; percentile: number }> {
  const bucket = scoreToBucket(score);
  await Promise.all([
    redis.incrBy(dailyKey(dateStr, 'total'), 1),
    redis.incrBy(dailyKey(dateStr, decision === 'PASS' ? 'pass' : 'purge'), 1),
    correct ? redis.incrBy(dailyKey(dateStr, 'correct'), 1) : Promise.resolve(0),
    redis.incrBy(dailyKey(dateStr, `bucket_${bucket}`), 1),
  ]);

  const bucketReads = await Promise.all(
    Array.from({ length: 11 }, (_, idx) => redis.get(dailyKey(dateStr, `bucket_${idx}`)))
  );
  const counts = bucketReads.map(parseIntSafe);
  const totalScored = counts.reduce((sum, v) => sum + v, 0);
  let strictlyHigher = 0;
  for (let b = bucket + 1; b <= 10; b += 1) {
    strictlyHigher += counts[b] ?? 0;
  }

  // Top X% (1..99): lower is better (e.g. Top 12%)
  const percentile =
    totalScored <= 1
      ? Math.max(5, 100 - score)
      : Math.max(1, Math.min(99, Math.round(((strictlyHigher + 1) / totalScored) * 100)));

  const community = await loadCommunityStats(redis, dateStr);
  return { community, percentile };
}
