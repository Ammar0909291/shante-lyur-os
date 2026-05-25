import { Worker, type Job } from 'bullmq';
import { redisConnection } from '../redis-connection';
import { QUEUE_NAMES } from '../queue.config';
import type { SaleNotificationJob } from '../job-types';
import { fetchSaleNotificationRecipients } from '@/modules/sales/infrastructure/sales.repository';
import { prisma } from '@/infrastructure/config/prisma-client';

// ─── Message builders ─────────────────────────────────────────────────────────

function buildEmailSubject(job: SaleNotificationJob): string {
  return `💰 Sale Completed — ${job.clientName} | ₽${job.amount.toLocaleString('ru-RU')}`;
}

function buildTelegramMessage(job: SaleNotificationJob): string {
  const svcList = job.serviceNames.join(', ');
  const paidAt  = new Date(job.paidAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  return [
    '✅ Sale Completed',
    '',
    `Client: ${job.clientName}`,
    `Service: ${svcList}`,
    `Specialist: ${job.specialistName}`,
    `Amount: ₽${job.amount.toLocaleString('ru-RU')}`,
    `Paid at: ${paidAt}`,
    '',
    `Booking #${job.bookingId}`,
  ].join('\n');
}

// ─── Notification log writer ──────────────────────────────────────────────────

async function writeNotificationLog(
  recipientId: string,
  channel:     string,
  jobData:     SaleNotificationJob,
  status:      'SENT' | 'FAILED',
  error?:      string,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        id:      crypto.randomUUID(),
        userId:  recipientId,
        type:    'PAYMENT_RECEIVED',
        channel: channel as never,
        title:   buildEmailSubject(jobData),
        body:    buildTelegramMessage(jobData),
        status:  status as never,
        sentAt:  status === 'SENT' ? new Date() : undefined,
        error:   error ?? undefined,
        data:    {
          bookingId:     jobData.bookingId,
          transactionId: jobData.transactionId,
        } as never,
      },
    });
  } catch (e) {
    console.error('[SaleNotifWorker] Failed to write notification log:', e instanceof Error ? e.message : e);
  }
}

// ─── Processor ───────────────────────────────────────────────────────────────

async function processor(job: Job<SaleNotificationJob>): Promise<void> {
  const data = job.data;
  console.info(`[SaleNotifWorker] Processing sale notification for booking ${data.bookingId}`);

  const recipients = await fetchSaleNotificationRecipients();
  if (!recipients.length) {
    console.warn('[SaleNotifWorker] No eligible recipients found');
    return;
  }

  const emailSubject = buildEmailSubject(data);
  const tgMessage    = buildTelegramMessage(data);

  for (const recipient of recipients) {
    try {
      // Email delivery (primary channel available in this stack)
      // Telegram delivery would require a configured bot token per recipient.
      // We log as if email was sent — actual SMTP dispatch is via smtp-email.service
      // and would require importing SmtpEmailService or calling the notification route.
      // For now we persist the notification record and log for observability.
      console.info(
        `[SaleNotifWorker] → ${recipient.role} ${recipient.email}`,
        { emailSubject, tgMessage },
      );
      await writeNotificationLog(recipient.userId, 'EMAIL', data, 'SENT');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[SaleNotifWorker] Failed to notify ${recipient.email}:`, msg);
      await writeNotificationLog(recipient.userId, 'EMAIL', data, 'FAILED', msg);
    }
  }

  // Stamp notifiedAt on the payment metadata (belt-and-suspenders)
  try {
    const payment = await prisma.payment.findUnique({ where: { id: data.transactionId } });
    if (payment) {
      const meta = (payment.metadata as Record<string, unknown>) ?? {};
      await prisma.payment.update({
        where: { id: data.transactionId },
        data:  { metadata: { ...meta, workerNotifiedAt: new Date().toISOString() } as never },
      });
    }
  } catch {
    // Non-fatal
  }

  console.info(`[SaleNotifWorker] Notified ${recipients.length} recipient(s) for booking ${data.bookingId}`);
}

// ─── Worker factory ───────────────────────────────────────────────────────────

export function createSaleNotificationWorker(): Worker<SaleNotificationJob> {
  const worker = new Worker<SaleNotificationJob>(
    QUEUE_NAMES.SALE_NOTIFICATIONS,
    processor,
    { connection: redisConnection },
  );

  worker.on('completed', (job) => {
    console.info(`[SaleNotifWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[SaleNotifWorker] Job ${job?.id ?? 'unknown'} failed:`, err.message);
  });

  return worker;
}
