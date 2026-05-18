import { BaseEntity } from './base.entity';
import { MembershipStatus } from '../enums';

export interface ClientMembershipProps {
  id: string;
  profileId: string;
  planId: string;
  status: MembershipStatus;
  startedAt: Date;
  renewsAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  sessionsUsed: number;
  autoRenew: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ClientMembership extends BaseEntity {
  private _status: MembershipStatus;
  private _sessionsUsed: number;

  constructor(private readonly props: ClientMembershipProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._status = props.status;
    this._sessionsUsed = props.sessionsUsed;
  }

  get profileId(): string { return this.props.profileId; }
  get planId(): string { return this.props.planId; }
  get status(): MembershipStatus { return this._status; }
  get startedAt(): Date { return this.props.startedAt; }
  get renewsAt(): Date | undefined { return this.props.renewsAt; }
  get cancelledAt(): Date | undefined { return this.props.cancelledAt; }
  get cancelReason(): string | undefined { return this.props.cancelReason; }
  get sessionsUsed(): number { return this._sessionsUsed; }
  get autoRenew(): boolean { return this.props.autoRenew; }
  get notes(): string | undefined { return this.props.notes; }

  get isActive(): boolean { return this._status === MembershipStatus.ACTIVE; }

  cancel(reason?: string): void {
    if (this._status === MembershipStatus.CANCELLED) {
      throw new Error('Membership already cancelled');
    }
    this._status = MembershipStatus.CANCELLED;
    this.props.cancelledAt = new Date();
    this.props.cancelReason = reason;
    this.updatedAt = new Date();
  }

  pause(): void {
    if (this._status !== MembershipStatus.ACTIVE) {
      throw new Error('Can only pause an active membership');
    }
    this._status = MembershipStatus.PAUSED;
    this.updatedAt = new Date();
  }

  resume(): void {
    if (this._status !== MembershipStatus.PAUSED) {
      throw new Error('Can only resume a paused membership');
    }
    this._status = MembershipStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  recordSessionUse(): void {
    this._sessionsUsed += 1;
    this.updatedAt = new Date();
  }

  resetPeriod(renewsAt: Date): void {
    this._sessionsUsed = 0;
    this.props.renewsAt = renewsAt;
    this.updatedAt = new Date();
  }
}
