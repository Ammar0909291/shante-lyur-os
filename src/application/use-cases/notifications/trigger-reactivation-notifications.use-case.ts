import { ICustomerProfileRepository } from '../../ports/customer-profile-repository.port';
import { IUserRepository } from '../../ports/user-repository.port';
import { NotificationServicePort } from '../../ports/notification-service.port';

export class TriggerReactivationNotificationsUseCase {
  constructor(
    private readonly customerProfileRepo: ICustomerProfileRepository,
    private readonly userRepo: IUserRepository,
    private readonly notificationService: NotificationServicePort,
  ) {}

  async execute(options?: { minChurnRisk?: number; limit?: number; promoCode?: string }): Promise<{ sent: number; errors: number }> {
    const minChurnRisk = options?.minChurnRisk ?? 0.6;
    const limit = options?.limit ?? 50;
    const promoCode = options?.promoCode;

    const { items: profiles } = await this.customerProfileRepo.findMany({
      maxChurnRisk: undefined,
      limit,
    });

    const atRisk = profiles.filter(p => {
      const risk = (p as any).churnRiskScore ?? 0;
      return risk >= minChurnRisk;
    });

    let sent = 0;
    let errors = 0;

    for (const profile of atRisk) {
      try {
        const stats = await this.customerProfileRepo.getLoyaltyStats(profile.id);
        if (!stats?.lastVisitAt) continue;

        const daysSince = Math.floor((Date.now() - stats.lastVisitAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < 30) continue;

        const user = await this.userRepo.findById(profile.userId);
        if (!user) continue;

        await this.notificationService.sendReactivation(user, {
          daysSinceLastVisit: daysSince,
          promoCode,
        });
        sent++;
      } catch {
        errors++;
      }
    }

    return { sent, errors };
  }
}
