import { Worker, type Job } from 'bullmq';
import { redisConnection } from '../redis-connection';
import { QUEUE_NAMES } from '../queue.config';
import type { AIPredictionJob } from '../job-types';
import { di } from '@/infrastructure/config/di-registry';

function createProcessor() {
  return async (job: Job<AIPredictionJob>): Promise<void> => {
    const { type, entityId, contextData } = job.data;
    const registry = di();

    console.info(
      `[AIPredictionWorker] Processing job ${job.id}: type=${type}, entityId=${entityId}`,
    );

    switch (type) {
      case 'no_show': {
        const result = await registry.aiPredictionService.predictNoShow(entityId);
        console.info(
          `[AIPredictionWorker] No-show prediction for entity ${entityId}: probability=${result.probability}`,
          result.factors,
        );
        break;
      }
      case 'revenue_forecast': {
        const days = typeof contextData['days'] === 'number' ? contextData['days'] : 7;
        const forecast = await registry.aiPredictionService.forecastRevenue(days);
        console.info(
          `[AIPredictionWorker] Revenue forecast generated: ${forecast.length} data points`,
        );
        break;
      }
      case 'slot_recommendation': {
        const date =
          typeof contextData['date'] === 'string'
            ? new Date(contextData['date'])
            : new Date();
        const slots = await registry.aiPredictionService.recommendSlots(entityId, date);
        console.info(
          `[AIPredictionWorker] Slot recommendations for specialist ${entityId}: ${slots.length} slots`,
        );
        break;
      }
      case 'churn': {
        // Churn prediction — log for now; extend aiPredictionService as needed
        console.info(
          `[AIPredictionWorker] Churn prediction requested for entity ${entityId}`,
          contextData,
        );
        break;
      }
      default: {
        const _exhaustive: never = type;
        throw new Error(`Unsupported AI prediction type: ${String(_exhaustive)}`);
      }
    }

    console.info(`[AIPredictionWorker] Job ${job.id} completed successfully`);
  };
}

export function createAIPredictionWorker(): Worker<AIPredictionJob> {
  const worker = new Worker<AIPredictionJob>(
    QUEUE_NAMES.AI_PREDICTIONS,
    createProcessor(),
    { connection: redisConnection },
  );

  worker.on('completed', (job: Job<AIPredictionJob>) => {
    console.info(`[AIPredictionWorker] Job ${job.id} finished`);
  });

  worker.on('failed', (job: Job<AIPredictionJob> | undefined, err: Error) => {
    console.error(
      `[AIPredictionWorker] Job ${job?.id ?? 'unknown'} failed:`,
      err.message,
    );
  });

  return worker;
}
