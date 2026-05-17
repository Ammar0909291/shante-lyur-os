import IORedis from 'ioredis';

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379/0';

/**
 * Shared IORedis connection for BullMQ.
 * BullMQ requires maxRetriesPerRequest: null to function correctly.
 */
export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
