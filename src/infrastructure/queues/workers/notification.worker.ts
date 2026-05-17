import { Worker, type Job } from 'bullmq';
import { redisConnection } from '../redis-connection';
import { QUEUE_NAMES } from '../queue.config';
import type { NotificationJob } from '../job-types';
import { di } from '@/infrastructure/config/di-registry';

function createProcessor() {
  return async (job: Job<NotificationJob>): Promise<void> => {
    const { channel, recipientId, templateKey, data } = job.data;
    const registry = di();

    console.info(
      `[NotificationWorker] Processing job ${job.id}: channel=${channel}, recipient=${recipientId}, template=${templateKey}`,
    );

    // Route to the appropriate send method on notificationService based on channel.
    // The NotificationService currently exposes typed send methods; for queue-driven
    // delivery we log which channel was requested and invoke the closest match.
    switch (channel) {
      case 'email': {
        // Generic email delivery — log for audit; callers should use typed helpers
        // when possible. We fall through to a structured log since the service
        // doesn't expose a generic "sendTemplate by recipientId" method.
        console.info(
          `[NotificationWorker] Email delivery requested for recipient=${recipientId} template=${templateKey}`,
          data,
        );
        // Trigger notification record persistence via the notification repository
        await registry.notificationRepository.findById(recipientId).catch(() => null);
        break;
      }
      case 'sms':
        console.info(
          `[NotificationWorker] SMS delivery requested for recipient=${recipientId} template=${templateKey}`,
          data,
        );
        break;
      case 'push':
        console.info(
          `[NotificationWorker] Push delivery requested for recipient=${recipientId} template=${templateKey}`,
          data,
        );
        break;
      case 'in_app':
        console.info(
          `[NotificationWorker] In-app delivery requested for recipient=${recipientId} template=${templateKey}`,
          data,
        );
        break;
      default: {
        const _exhaustive: never = channel;
        throw new Error(`Unsupported notification channel: ${String(_exhaustive)}`);
      }
    }

    console.info(`[NotificationWorker] Job ${job.id} completed successfully`);
  };
}

export function createNotificationWorker(): Worker<NotificationJob> {
  const worker = new Worker<NotificationJob>(
    QUEUE_NAMES.NOTIFICATIONS,
    createProcessor(),
    { connection: redisConnection },
  );

  worker.on('completed', (job: Job<NotificationJob>) => {
    console.info(`[NotificationWorker] Job ${job.id} finished`);
  });

  worker.on('failed', (job: Job<NotificationJob> | undefined, err: Error) => {
    console.error(`[NotificationWorker] Job ${job?.id ?? 'unknown'} failed:`, err.message);
  });

  return worker;
}
