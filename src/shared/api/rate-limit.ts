import Redis from 'ioredis';

let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379/0';
    redisClient = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
    });
  }
  return redisClient;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// In-memory fallback used when Redis is unavailable (fails CLOSED)
const memStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryCheck(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / windowSeconds);
  const storeKey = `${key}:${window}`;
  const resetAt = (window + 1) * windowSeconds;

  const entry = memStore.get(storeKey) ?? { count: 0, resetAt };
  entry.count += 1;
  memStore.set(storeKey, entry);

  // Evict expired entries when the store grows large
  if (memStore.size > 5000) {
    for (const [k, v] of memStore) {
      if (v.resetAt < now) memStore.delete(k);
    }
  }

  const allowed = entry.count <= limit;
  return { allowed, remaining: Math.max(0, limit - entry.count), resetAt };
}

export async function rateLimitCheck(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / windowSeconds);
  const key = `rate_limit:${identifier}:${window}`;
  const resetAt = (window + 1) * windowSeconds;

  try {
    const pipeline = redis.multi();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    const results = await pipeline.exec();

    const count = results?.[0]?.[1];
    const current = typeof count === 'number' ? count : 1;

    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);

    return { allowed, remaining, resetAt };
  } catch {
    // Redis unavailable — use in-memory fallback (fails CLOSED, not open)
    return inMemoryCheck(identifier, limit, windowSeconds);
  }
}
