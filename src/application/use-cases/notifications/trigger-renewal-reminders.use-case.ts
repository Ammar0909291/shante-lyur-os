import { IClientMembershipRepository } from '../../ports/membership-repository.port';
import { IUserRepository } from '../../ports/user-repository.port';
import { NotificationServicePort } from '../../ports/notification-service.port';

export class TriggerRenewalRemindersUseCase {
  constructor(
    private readonly membershipRepo: IClientMembershipRepository,
    private readonly userRepo: IUserRepository,
    private readonly notificationService: NotificationServicePort,
  ) {}

  async execute(options?: { withinDays?: number }): Promise<{ sent: number; errors: number }> {
    const withinDays = options?.withinDays ?? 7;

    const expiring = await this.membershipRepo.findExpiringSoon(withinDays);

    let sent = 0;
    let errors = 0;

    for (const record of expiring) {
      try {
        const user = await this.userRepo.findById(record.userId);
        if (!user) continue;

        const renewsAt = record.membership.renewsAt ?? record.membership.startedAt;
        const daysLeft = Math.max(0, Math.floor(
          (renewsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ));

        await this.notificationService.sendMembershipRenewalReminder(user, {
          planName: (record.membership as any).planName ?? 'Абонемент',
          expiresAt: renewsAt.toLocaleDateString('ru-RU'),
          daysLeft,
        });
        sent++;
      } catch {
        errors++;
      }
    }

    return { sent, errors };
  }
}
