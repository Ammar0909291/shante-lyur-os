import { Worker, type Job } from 'bullmq';
import { redisConnection } from '../redis-connection';
import { QUEUE_NAMES } from '../queue.config';
import type { AppointmentReminderJob } from '../job-types';
import { buildBookingNotificationPayload } from '@/lib/communication/payload-builder';
import { triggerBookingReminder } from '@/lib/communication/booking-triggers';
import { prisma } from '@/infrastructure/config/prisma-client';

function createProcessor() {
  return async (job: Job<AppointmentReminderJob>): Promise<void> => {
    const { appointmentId, reminderType } = job.data;

    console.info(`[AppointmentReminderWorker] Job ${job.id}: appointment=${appointmentId} type=${reminderType}`);

    // Skip if appointment is no longer active
    const status = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { status: true },
    });
    if (!status) {
      console.warn(`[AppointmentReminderWorker] Appointment ${appointmentId} not found — skipping`);
      return;
    }
    if (['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(status.status)) {
      console.info(`[AppointmentReminderWorker] Appointment ${appointmentId} is ${status.status} — skipping reminder`);
      return;
    }

    // Only 24h and 2h windows supported by triggerBookingReminder
    if (reminderType !== '24h' && reminderType !== '2h') {
      console.warn(`[AppointmentReminderWorker] Unsupported reminderType '${reminderType}' — skipping`);
      return;
    }

    const payload = await buildBookingNotificationPayload(appointmentId);
    if (!payload) {
      console.warn(`[AppointmentReminderWorker] Could not build payload for ${appointmentId} — skipping`);
      return;
    }

    await triggerBookingReminder({ ...payload, window: reminderType });

    console.info(
      `[AppointmentReminderWorker] Reminder (${reminderType}) sent for appointment ${appointmentId} — service: "${payload.serviceName}"`,
    );
  };
}

export function createAppointmentReminderWorker(): Worker<AppointmentReminderJob> {
  const worker = new Worker<AppointmentReminderJob>(
    QUEUE_NAMES.APPOINTMENT_REMINDERS,
    createProcessor(),
    { connection: redisConnection, concurrency: 5 },
  );

  worker.on('completed', (job: Job<AppointmentReminderJob>) => {
    console.info(`[AppointmentReminderWorker] Job ${job.id} finished`);
  });

  worker.on('failed', (job: Job<AppointmentReminderJob> | undefined, err: Error) => {
    console.error(`[AppointmentReminderWorker] Job ${job?.id ?? 'unknown'} failed: ${err.message}`);
  });

  return worker;
}
