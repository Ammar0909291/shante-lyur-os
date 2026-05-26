import IORedis from 'ioredis';

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: IORedis | undefined;
}

function create(): IORedis {
  return new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379/0', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: false,
  });
}

export const redis: IORedis =
  process.env['NODE_ENV'] === 'production'
    ? create()
    : (globalThis.__redisClient ??= create());

// ── Presence ─────────────────────────────────────────────────────────────────

export interface Presence {
  online: boolean;
  activePage: string;
  lastSeen: number;
}

const PRESENCE_TTL = 90;

export async function setPresence(userId: string, activePage: string): Promise<void> {
  try {
    const val: Presence = { online: true, activePage, lastSeen: Date.now() };
    await redis.set(`presence:${userId}`, JSON.stringify(val), 'EX', PRESENCE_TTL);
  } catch { /* Redis unavailable — no-op */ }
}

export async function getPresence(userId: string): Promise<Presence | null> {
  try {
    const raw = await redis.get(`presence:${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as Presence;
  } catch { return null; }
}

// ── Unread counts ─────────────────────────────────────────────────────────────

export async function incrementUnread(userId: string, convId: string): Promise<void> {
  try {
    await Promise.all([
      redis.incr(`chat:unread:${userId}`),
      redis.incr(`chat:unread:${userId}:${convId}`),
    ]);
  } catch { /* Redis unavailable — no-op */ }
}

export async function resetConvUnread(userId: string, convId: string): Promise<void> {
  try {
    const convCount = parseInt((await redis.get(`chat:unread:${userId}:${convId}`)) ?? '0', 10);
    if (convCount > 0) {
      await redis.decrby(`chat:unread:${userId}`, convCount);
      await redis.set(`chat:unread:${userId}:${convId}`, '0');
      const total = parseInt((await redis.get(`chat:unread:${userId}`)) ?? '0', 10);
      if (total < 0) await redis.set(`chat:unread:${userId}`, '0');
    }
  } catch { /* Redis unavailable — no-op */ }
}

export async function getTotalUnread(userId: string): Promise<number> {
  try {
    return Math.max(0, parseInt((await redis.get(`chat:unread:${userId}`)) ?? '0', 10));
  } catch { return 0; }
}

export async function getConvUnread(userId: string, convId: string): Promise<number> {
  try {
    return Math.max(0, parseInt((await redis.get(`chat:unread:${userId}:${convId}`)) ?? '0', 10));
  } catch { return 0; }
}

// ── Typing ────────────────────────────────────────────────────────────────────

export async function setTyping(convId: string, userId: string): Promise<void> {
  try {
    await redis.set(`typing:${convId}:${userId}`, '1', 'EX', 3);
  } catch { /* Redis unavailable — no-op */ }
}
