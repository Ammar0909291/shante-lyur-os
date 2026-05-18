import { PrismaClient } from '@prisma/client';
import { IMembershipPlanRepository, IClientMembershipRepository } from '@/application/ports';
import { MembershipPlan, ClientMembership } from '@/domain/entities';
import { MembershipBillingPeriod, MembershipStatus } from '@/domain/enums';

function toPlanDomain(raw: {
  id: string;
  name: string;
  description: string | null;
  billingPeriod: string;
  billingPrice: any;
  includedSessions: number | null;
  discountPercent: number;
  bonusPointsPerPeriod: number;
  applicableServiceIds: any;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): MembershipPlan {
  return new MembershipPlan({
    id: raw.id,
    name: raw.name,
    description: raw.description ?? undefined,
    billingPeriod: raw.billingPeriod as MembershipBillingPeriod,
    billingPrice: Number(raw.billingPrice),
    includedSessions: raw.includedSessions ?? undefined,
    discountPercent: raw.discountPercent,
    bonusPointsPerPeriod: raw.bonusPointsPerPeriod,
    applicableServiceIds: Array.isArray(raw.applicableServiceIds) ? raw.applicableServiceIds : [],
    isActive: raw.isActive,
    sortOrder: raw.sortOrder,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  });
}

function toMembershipDomain(raw: {
  id: string;
  profileId: string;
  planId: string;
  status: string;
  startedAt: Date;
  renewsAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  sessionsUsed: number;
  autoRenew: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ClientMembership {
  return new ClientMembership({
    id: raw.id,
    profileId: raw.profileId,
    planId: raw.planId,
    status: raw.status as MembershipStatus,
    startedAt: raw.startedAt,
    renewsAt: raw.renewsAt ?? undefined,
    cancelledAt: raw.cancelledAt ?? undefined,
    cancelReason: raw.cancelReason ?? undefined,
    sessionsUsed: raw.sessionsUsed,
    autoRenew: raw.autoRenew,
    notes: raw.notes ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  });
}

export class PrismaMembershipPlanRepository implements IMembershipPlanRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<MembershipPlan | null> {
    const raw = await this.db.membershipPlan.findUnique({ where: { id } });
    return raw ? toPlanDomain(raw) : null;
  }

  async findAll(onlyActive = true): Promise<MembershipPlan[]> {
    const raws = await this.db.membershipPlan.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return raws.map(toPlanDomain);
  }

  async create(plan: MembershipPlan): Promise<MembershipPlan> {
    const raw = await this.db.membershipPlan.create({
      data: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        billingPeriod: plan.billingPeriod,
        billingPrice: plan.billingPrice,
        includedSessions: plan.includedSessions,
        discountPercent: plan.discountPercent,
        bonusPointsPerPeriod: plan.bonusPointsPerPeriod,
        applicableServiceIds: plan.applicableServiceIds,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
      },
    });
    return toPlanDomain(raw);
  }

  async update(plan: MembershipPlan): Promise<MembershipPlan> {
    const raw = await this.db.membershipPlan.update({
      where: { id: plan.id },
      data: {
        name: plan.name,
        description: plan.description,
        billingPeriod: plan.billingPeriod,
        billingPrice: plan.billingPrice,
        includedSessions: plan.includedSessions,
        discountPercent: plan.discountPercent,
        bonusPointsPerPeriod: plan.bonusPointsPerPeriod,
        applicableServiceIds: plan.applicableServiceIds,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
        updatedAt: new Date(),
      },
    });
    return toPlanDomain(raw);
  }
}

export class PrismaClientMembershipRepository implements IClientMembershipRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<ClientMembership | null> {
    const raw = await this.db.clientMembership.findUnique({ where: { id } });
    return raw ? toMembershipDomain(raw) : null;
  }

  async findByProfileId(profileId: string): Promise<ClientMembership[]> {
    const raws = await this.db.clientMembership.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map(toMembershipDomain);
  }

  async findActiveByProfileId(profileId: string): Promise<ClientMembership | null> {
    const raw = await this.db.clientMembership.findFirst({
      where: { profileId, status: 'ACTIVE' },
    });
    return raw ? toMembershipDomain(raw) : null;
  }

  async findExpiringSoon(withinDays: number): Promise<Array<{
    membership: ClientMembership;
    profileId: string;
    userId: string;
    email: string;
    firstName: string;
  }>> {
    const cutoff = new Date(Date.now() + withinDays * 86_400_000);
    const raws = await this.db.clientMembership.findMany({
      where: {
        status: 'ACTIVE',
        renewsAt: { lte: cutoff },
      },
      include: {
        profile: {
          include: { user: { select: { id: true, email: true, firstName: true } } },
        },
      },
    });
    return raws.map(r => ({
      membership: toMembershipDomain(r),
      profileId: r.profileId,
      userId: (r as any).profile.user.id,
      email: (r as any).profile.user.email,
      firstName: (r as any).profile.user.firstName,
    }));
  }

  async create(membership: ClientMembership): Promise<ClientMembership> {
    const raw = await this.db.clientMembership.create({
      data: {
        id: membership.id,
        profileId: membership.profileId,
        planId: membership.planId,
        status: membership.status,
        startedAt: membership.startedAt,
        renewsAt: membership.renewsAt,
        sessionsUsed: membership.sessionsUsed,
        autoRenew: membership.autoRenew,
        notes: membership.notes,
      },
    });
    return toMembershipDomain(raw);
  }

  async update(membership: ClientMembership): Promise<ClientMembership> {
    const raw = await this.db.clientMembership.update({
      where: { id: membership.id },
      data: {
        status: membership.status,
        renewsAt: membership.renewsAt,
        cancelledAt: membership.cancelledAt,
        cancelReason: membership.cancelReason,
        sessionsUsed: membership.sessionsUsed,
        autoRenew: membership.autoRenew,
        notes: membership.notes,
        updatedAt: new Date(),
      },
    });
    return toMembershipDomain(raw);
  }
}
