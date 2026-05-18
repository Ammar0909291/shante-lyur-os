import { MembershipPlan, ClientMembership } from '@/domain/entities';

export interface IMembershipPlanRepository {
  findById(id: string): Promise<MembershipPlan | null>;
  findAll(onlyActive?: boolean): Promise<MembershipPlan[]>;
  create(plan: MembershipPlan): Promise<MembershipPlan>;
  update(plan: MembershipPlan): Promise<MembershipPlan>;
}

export interface IClientMembershipRepository {
  findById(id: string): Promise<ClientMembership | null>;
  findByProfileId(profileId: string): Promise<ClientMembership[]>;
  findActiveByProfileId(profileId: string): Promise<ClientMembership | null>;
  findExpiringSoon(withinDays: number): Promise<Array<{
    membership: ClientMembership;
    profileId: string;
    userId: string;
    email: string;
    firstName: string;
  }>>;
  create(membership: ClientMembership): Promise<ClientMembership>;
  update(membership: ClientMembership): Promise<ClientMembership>;
}
