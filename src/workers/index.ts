/**
 * Worker host — runs all BullMQ workers as a standalone Node process.
 * Start with: npm run worker:start
 *
 * Keep this process running alongside the Next.js server in production.
 * Redis must be reachable at REDIS_URL before starting.
 */

import 'dotenv/config';
import { startAllWorkers, stopAllWorkers } from '@/infrastructure/queues/worker-registry';

const workers = startAllWorkers();

console.info(`[WorkerHost] ${workers.length} workers running. Redis: ${process.env['REDIS_URL'] ?? 'redis://localhost:6379/0'}`);
console.info('[WorkerHost] Workers:', workers.map((w) => w.name).join(', '));

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[WorkerHost] ${signal} received — graceful shutdown...`);
  await stopAllWorkers();
  console.info('[WorkerHost] All workers stopped. Exiting.');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[WorkerHost] Uncaught exception:', err);
  void shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('[WorkerHost] Unhandled rejection:', reason);
});
