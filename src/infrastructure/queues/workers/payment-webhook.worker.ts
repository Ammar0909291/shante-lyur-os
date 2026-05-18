import { Worker, type Job } from 'bullmq';
import { redisConnection } from '../redis-connection';
import { QUEUE_NAMES } from '../queue.config';
import type { PaymentWebhookJob } from '../job-types';
import { di } from '@/infrastructure/config/di-registry';
import { PaymentProvider } from '@/domain/enums/payment-provider.enum';
import { ProcessWebhookUseCase } from '@/application/use-cases/payment';

function createProcessor() {
  return async (job: Job<PaymentWebhookJob>): Promise<void> => {
    const { provider, rawPayload, signature, receivedAt } = job.data;
    const registry = di();

    console.info(
      `[PaymentWebhookWorker] Processing job ${job.id}: provider=${provider}, receivedAt=${receivedAt}`,
    );

    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(rawPayload) as Record<string, unknown>;
    } catch {
      throw new Error(`[PaymentWebhookWorker] Invalid JSON payload for job ${job.id}`);
    }

    const bullmqProvider =
      provider === 'yookassa' ? PaymentProvider.YOOKASSA : PaymentProvider.ROBOKASSA;

    const useCase = new ProcessWebhookUseCase(
      registry.paymentRepository,
      registry.refundRepository,
      registry.yooKassaGateway,
      registry.robokassaGateway,
      { publish: async () => {}, subscribe: () => {} },
      registry.auditLogRepository,
      registry.appointmentRepository,
      registry.customerProfileRepository,
      registry.specialistRepository,
      registry.revenueRecordRepository,
    );

    await useCase.execute({
      provider: bullmqProvider,
      payload: parsedPayload,
      signature,
    });

    console.info(`[PaymentWebhookWorker] Job ${job.id} processed`);
  };
}

export function createPaymentWebhookWorker(): Worker<PaymentWebhookJob> {
  const worker = new Worker<PaymentWebhookJob>(
    QUEUE_NAMES.PAYMENT_WEBHOOKS,
    createProcessor(),
    { connection: redisConnection },
  );

  worker.on('completed', (job: Job<PaymentWebhookJob>) => {
    console.info(`[PaymentWebhookWorker] Job ${job.id} finished`);
  });

  worker.on('failed', (job: Job<PaymentWebhookJob> | undefined, err: Error) => {
    console.error(
      `[PaymentWebhookWorker] Job ${job?.id ?? 'unknown'} failed:`,
      err.message,
    );
  });

  return worker;
}
