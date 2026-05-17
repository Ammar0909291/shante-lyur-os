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
    // Fail open: if Redis is unavailable, allow the request
    return { allowed: true, remaining: limit, resetAt };
  }
}
