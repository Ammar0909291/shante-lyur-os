import { BaseEntity } from './base.entity';
import { ClientPackageStatus } from '../enums';

export interface ClientPackageProps {
  id: string;
  profileId: string;
  name: string;
  serviceId?: string;
  totalSessions: number;
  usedSessions: number;
  priceTotal: number;
  purchasedAt: Date;
  expiresAt?: Date;
  status: ClientPackageStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ClientPackage extends BaseEntity {
  private _usedSessions: number;
  private _status: ClientPackageStatus;

  constructor(private readonly props: ClientPackageProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this._usedSessions = props.usedSessions;
    this._status = props.status;
  }

  get profileId(): string { return this.props.profileId; }
  get name(): string { return this.props.name; }
  get serviceId(): string | undefined { return this.props.serviceId; }
  get totalSessions(): number { return this.props.totalSessions; }
  get usedSessions(): number { return this._usedSessions; }
  get remainingSessions(): number { return this.props.totalSessions - this._usedSessions; }
  get priceTotal(): number { return this.props.priceTotal; }
  get purchasedAt(): Date { return this.props.purchasedAt; }
  get expiresAt(): Date | undefined { return this.props.expiresAt; }
  get status(): ClientPackageStatus { return this._status; }
  get notes(): string | undefined { return this.props.notes; }

  get isActive(): boolean { return this._status === ClientPackageStatus.ACTIVE; }

  get isExpired(): boolean {
    if (!this.props.expiresAt) return false;
    return new Date() > this.props.expiresAt;
  }

  useSession(): void {
    if (this._status !== ClientPackageStatus.ACTIVE) {
      throw new Error('Package is not active');
    }
    if (this.isExpired) {
      this._status = ClientPackageStatus.EXPIRED;
      this.updatedAt = new Date();
      throw new Error('Package has expired');
    }
    if (this.remainingSessions <= 0) {
      throw new Error('No sessions remaining in package');
    }
    this._usedSessions += 1;
    if (this._usedSessions >= this.props.totalSessions) {
      this._status = ClientPackageStatus.EXHAUSTED;
    }
    this.updatedAt = new Date();
  }

  cancel(): void {
    if (this._status === ClientPackageStatus.CANCELLED) {
      throw new Error('Package already cancelled');
    }
    this._status = ClientPackageStatus.CANCELLED;
    this.updatedAt = new Date();
  }
}
