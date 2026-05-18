import { IAppointmentRepository } from '../../ports/appointment-repository.port';
import { IUserRepository } from '../../ports/user-repository.port';
import { NotificationServicePort } from '../../ports/notification-service.port';
import { AppointmentStatus } from '../../../domain/enums';

export class TriggerFollowUpNotificationsUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly userRepo: IUserRepository,
    private readonly notificationService: NotificationServicePort,
  ) {}

  async execute(options?: { daysSince?: number; limit?: number }): Promise<{ sent: number; errors: number }> {
    const daysSince = options?.daysSince ?? 3;
    const limit = options?.limit ?? 50;

    const cutoffEnd = new Date();
    cutoffEnd.setDate(cutoffEnd.getDate() - daysSince);
    const cutoffStart = new Date(cutoffEnd);
    cutoffStart.setHours(0, 0, 0, 0);
    cutoffEnd.setHours(23, 59, 59, 999);

    const { items: appointments } = await this.appointmentRepo.findMany({
      status: AppointmentStatus.COMPLETED,
      from: cutoffStart,
      to: cutoffEnd,
      limit,
    });

    let sent = 0;
    let errors = 0;

    for (const appt of appointments) {
      if (!appt.clientId) continue;
      try {
        const user = await this.userRepo.findById(appt.clientId);
        if (!user) continue;

        await this.notificationService.sendFollowUp(user, {
          serviceName: 'процедуру',
          daysSinceVisit: daysSince,
        });
        sent++;
      } catch {
        errors++;
      }
    }

    return { sent, errors };
  }
}
