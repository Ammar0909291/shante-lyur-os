import { Worker, type Job } from 'bullmq';
import { NotificationChannel } from '@/domain/enums/notification-channel.enum';
import { redisConnection } from '../redis-connection';
import { QUEUE_NAMES } from '../queue.config';
import type { AppointmentReminderJob } from '../job-types';
import { di } from '@/infrastructure/config/di-registry';

function createProcessor() {
  return async (job: Job<AppointmentReminderJob>): Promise<void> => {
    const { appointmentId, customerId, reminderType } = job.data;
    const registry = di();

    console.info(
      `[AppointmentReminderWorker] Processing job ${job.id}: appointmentId=${appointmentId}, reminderType=${reminderType}`,
    );

    // Fetch appointment details
    const appointment = await registry.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      console.warn(
        `[AppointmentReminderWorker] Appointment ${appointmentId} not found — skipping`,
      );
      return;
    }

    // Fetch the customer (user) record
    const user = await registry.userRepository.findById(customerId);
    if (!user) {
      console.warn(
        `[AppointmentReminderWorker] User ${customerId} not found — skipping`,
      );
      return;
    }

    const dateStr = appointment.startAt.toLocaleDateString('ru-RU');
    const timeStr = appointment.startAt.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send reminder notification
    await registry.notificationService.send({
      userId: user.id,
      type: 'APPOINTMENT_REMINDER',
      channel: NotificationChannel.EMAIL,
      title: 'Напоминание о записи',
      body: `Напоминаем о вашей записи ${dateStr} в ${timeStr}`,
      appointmentId,
    });

    console.info(
      `[AppointmentReminderWorker] Reminder (${reminderType}) sent for appointment ${appointmentId}`,
    );
  };
}

export function createAppointmentReminderWorker(): Worker<AppointmentReminderJob> {
  const worker = new Worker<AppointmentReminderJob>(
    QUEUE_NAMES.APPOINTMENT_REMINDERS,
    createProcessor(),
    { connection: redisConnection },
  );

  worker.on('completed', (job: Job<AppointmentReminderJob>) => {
    console.info(`[AppointmentReminderWorker] Job ${job.id} finished`);
  });

  worker.on('failed', (job: Job<AppointmentReminderJob> | undefined, err: Error) => {
    console.error(
      `[AppointmentReminderWorker] Job ${job?.id ?? 'unknown'} failed:`,
      err.message,
    );
  });

  return worker;
}
