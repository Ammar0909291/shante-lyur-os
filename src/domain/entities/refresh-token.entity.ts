import { BaseEntity } from './base.entity';

export interface RefreshTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedBy?: string;
  ipAddress?: string;
  createdAt: Date;
}

export class RefreshToken extends BaseEntity {
  static reconstitute(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  static create(props: { token: string; userId: string; expiresAt: Date; ipAddress?: string }): RefreshToken {
    const tokenHash = props.token; // In production, this should be hashed
    return new RefreshToken({
      id: crypto.randomUUID(),
      userId: props.userId,
      tokenHash,
      expiresAt: props.expiresAt,
      ipAddress: props.ipAddress,
      createdAt: new Date(),
    });
  }

  constructor(private readonly props: RefreshTokenProps) {
    super(props.id, props.createdAt, props.createdAt);
  }

  get userId(): string { return this.props.userId; }
  get tokenHash(): string { return this.props.tokenHash; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get revokedAt(): Date | undefined { return this.props.revokedAt; }
  get replacedBy(): string | undefined { return this.props.replacedBy; }
  get ipAddress(): string | undefined { return this.props.ipAddress; }

  get isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  get isRevoked(): boolean {
    return !!this.props.revokedAt;
  }

  get isValid(): boolean {
    return !this.isExpired && !this.isRevoked;
  }

  revoke(): void {
    this.props.revokedAt = new Date();
    this.updatedAt = new Date();
  }
}
