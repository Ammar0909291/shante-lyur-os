import IORedis from 'ioredis';

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379/0';

/**
 * Shared IORedis connection for BullMQ.
 * maxRetriesPerRequest: null is required by BullMQ.
 * lazyConnect + retryStrategy returning null means the app boots even without Redis.
 */
export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy: (times: number) => {
    if (times > 3) {
      console.warn('[Redis] Cannot connect — queue features disabled. Start Redis to enable reminders/messaging.');
      return null; // stop retrying
    }
    return Math.min(times * 500, 2000);
  },
});

redisConnection.on('error', (err: Error) => {
  if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') return; // silence repeated noise
  console.warn('[Redis] connection error:', err.message);
});
