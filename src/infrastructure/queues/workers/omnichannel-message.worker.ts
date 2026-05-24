import { Worker, type Job } from 'bullmq';
import { redisConnection } from '../redis-connection';
import { QUEUE_NAMES } from '../queue.config';
import type { OmnichannelMessageJob } from '../job-types';
import { getChannelRouter } from '@/lib/communication/channel-router';
import { renderTemplate } from '@/lib/communication/templates/definitions';
import { prisma } from '@/infrastructure/config/prisma-client';

const MAX_RETRIES = 3;

async function processOmnichannelMessage(job: Job<OmnichannelMessageJob>): Promise<void> {
  const { outboundMessageId, userId, channel, templateKey, vars, lang = 'ru' } = job.data;

  console.info(`[OmnichannelWorker] Job ${job.id}: channel=${channel} user=${userId} template=${templateKey}`);

  // Resolve recipient
  const pref = await prisma.communicationPreference.findUnique({ where: { userId } });

  let recipient: string | null = null;
  switch (channel) {
    case 'whatsapp': recipient = pref?.whatsappPhone ?? null; break;
    case 'telegram': recipient = pref?.telegramChatId ?? null; break;
    case 'max':      recipient = pref?.maxUserId ?? null; break;
    case 'email': {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      recipient = user?.email ?? null;
      break;
    }
  }

  if (!recipient) {
    await prisma.outboundMessage.update({
      where: { id: outboundMessageId },
      data: { status: 'FAILED', errorMessage: 'No recipient contact found', failedAt: new Date() },
    });
    console.warn(`[OmnichannelWorker] No recipient for user=${userId} channel=${channel}`);
    return;
  }

  const body = renderTemplate(templateKey, vars, lang);
  if (!body) {
    await prisma.outboundMessage.update({
      where: { id: outboundMessageId },
      data: { status: 'FAILED', errorMessage: `Template not found: ${templateKey}`, failedAt: new Date() },
    });
    return;
  }

  // Mark as queued
  await prisma.outboundMessage.update({
    where: { id: outboundMessageId },
    data: { status: 'QUEUED', recipientPhone: channel === 'whatsapp' ? recipient : null, recipientChatId: ['telegram', 'max'].includes(channel) ? recipient : null },
  });

  const router = getChannelRouter();
  const provider = router.getProvider(channel);

  if (!provider || !provider.isConfigured()) {
    await prisma.outboundMessage.update({
      where: { id: outboundMessageId },
      data: { status: 'FAILED', errorMessage: `Provider not configured: ${channel}`, failedAt: new Date() },
    });
    throw new Error(`Provider not configured: ${channel}`);
  }

  const result = await provider.send({ to: recipient, body });

  if (result.success) {
    await prisma.outboundMessage.update({
      where: { id: outboundMessageId },
      data: {
        status: 'SENT', sentAt: new Date(),
        externalId: result.externalId ?? null,
        providerResponse: result.providerResponse as never,
        retryCount: job.attemptsMade,
      },
    });
    console.info(`[OmnichannelWorker] Job ${job.id} delivered OK`);
  } else {
    const isLastAttempt = job.attemptsMade >= MAX_RETRIES - 1;
    await prisma.outboundMessage.update({
      where: { id: outboundMessageId },
      data: {
        status: isLastAttempt ? 'DEAD_LETTER' : 'FAILED',
        failedAt: new Date(),
        errorMessage: result.error,
        retryCount: job.attemptsMade,
        providerResponse: result.providerResponse as never,
      },
    });
    // Throw so BullMQ can retry
    throw new Error(result.error ?? 'Provider send failed');
  }
}

export function createOmnichannelMessageWorker(): Worker<OmnichannelMessageJob> {
  const worker = new Worker<OmnichannelMessageJob>(
    QUEUE_NAMES.OMNICHANNEL_MESSAGES,
    processOmnichannelMessage,
    {
      connection: redisConnection,
      concurrency: 10,
    },
  );

  worker.on('completed', (job: Job<OmnichannelMessageJob>) => {
    console.info(`[OmnichannelWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job: Job<OmnichannelMessageJob> | undefined, err: Error) => {
    console.error(`[OmnichannelWorker] Job ${job?.id ?? 'unknown'} failed (attempt ${job?.attemptsMade ?? '?'}/${MAX_RETRIES}): ${err.message}`);
  });

  return worker;
}
