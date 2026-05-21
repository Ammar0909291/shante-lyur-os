import { IAppointmentRepository } from '@/application/ports/appointment-repository.port';
import { INotificationService } from '@/application/ports/notification-service.port';
import { IUserRepository } from '@/application/ports/user-repository.port';
import { AppointmentStatus } from '@/domain/enums/appointment-status.enum';

export class AppointmentReminderWorker {
  private timer: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly userRepo: IUserRepository,
    private readonly notificationService: INotificationService,
  ) {}

  start(): void {
    this.timer = setInterval(() => this.run(), this.INTERVAL_MS);
    this.run();
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
        from: tomorrow,
        to: tomorrowEnd,
        status: AppointmentStatus.CONFIRMED,
      });

      for (const appt of appointments) {
        const user = await this.userRepo.findById(appt.clientId);
        if (!user) continue;

        const dateStr = appt.startAt.toLocaleDateString('ru-RU');
        const timeStr = appt.startAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        await this.notificationService.sendBookingReminder(user, {
          serviceName: 'Услуга',
          date: dateStr,
          time: timeStr,
        });
      }
    } catch (err) {
      console.error('[ReminderWorker] Error:', err);
    }
  }
}
