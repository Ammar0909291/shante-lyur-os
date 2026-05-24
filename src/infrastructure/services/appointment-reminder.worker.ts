import { IAppointmentRepository } from '@/application/ports/appointment-repository.port';
import { AppointmentStatus } from '@/domain/enums/appointment-status.enum';
import { buildBookingNotificationPayload } from '@/lib/communication/payload-builder';
import { triggerBookingReminder } from '@/lib/communication/booking-triggers';

export class AppointmentReminderWorker {
  private timer: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
  ) {}

  start(): void {
    this.timer = setInterval(() => void this.run(), this.INTERVAL_MS);
    void this.run();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async run(): Promise<void> {
    try {
      // Find all CONFIRMED appointments starting in the next 23–25 hour window
      // (catches anything BullMQ may have missed due to Redis downtime)
      const now = new Date();
      const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      const { items: appointments } = await this.appointmentRepo.findMany({
        from: windowStart,
        to: windowEnd,
        status: AppointmentStatus.CONFIRMED,
      });

      for (const appt of appointments) {
        try {
          const payload = await buildBookingNotificationPayload(appt.id);
          if (!payload) continue;
          await triggerBookingReminder({ ...payload, window: '24h' });
          console.info(`[ReminderWorker] 24h reminder sent for appointment ${appt.id} — service: "${payload.serviceName}"`);
        } catch (err) {
          console.warn(`[ReminderWorker] Failed for appointment ${appt.id}:`, err instanceof Error ? err.message : err);
        }
      }
    } catch (err) {
      console.error('[ReminderWorker] Error:', err);
    }
  }
}
