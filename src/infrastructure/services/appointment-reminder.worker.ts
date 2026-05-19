import { AppointmentRepositoryPort } from '@/application/ports/appointment-repository.port';
import { NotificationServicePort } from '@/application/ports/notification-service.port';
import { UserRepositoryPort } from '@/application/ports/user-repository.port';
import { AppointmentStatus } from '@/domain/enums/appointment-status.enum';
import { NotificationChannel } from '@/domain/enums/notification-channel.enum';
import { NotificationType } from '@/domain/enums/notification-type.enum';

export class AppointmentReminderWorker {
  private timer: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly appointmentRepo: AppointmentRepositoryPort,
    private readonly userRepo: UserRepositoryPort,
    private readonly notificationService: NotificationServicePort,
  ) {}

  start(): void {
    this.timer = setInterval(() => this.run(), this.INTERVAL_MS);
    void this.run();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async run(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const { items: appointments } = await this.appointmentRepo.findMany({
        status: [AppointmentStatus.CONFIRMED],
        from: tomorrow,
        to: tomorrowEnd,
        limit: 200,
      });

      for (const appt of appointments) {
        const user = await this.userRepo.findById(appt.clientId);
        if (!user) continue;

        const dateStr = appt.startAt.toLocaleDateString('ru-RU');
        const timeStr = appt.startAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        await this.notificationService.send({
          userId: user.id,
          type: NotificationType.APPOINTMENT_REMINDER,
          channel: NotificationChannel.EMAIL,
          title: 'Напоминание о записи',
          body: `Напоминаем о вашей записи завтра ${dateStr} в ${timeStr}`,
          appointmentId: appt.id,
        });
      }
    } catch (err) {
      console.error('[ReminderWorker] Error:', err);
    }
  }
}
