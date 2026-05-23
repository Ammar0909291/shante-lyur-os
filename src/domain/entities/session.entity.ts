import { BaseEntity } from './base.entity';

export interface SessionProps {
  id: string;
  userId: string;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
}

export class Session extends BaseEntity {
  static reconstitute(props: SessionProps): Session {
    return new Session(props);
  }

  static create(props: Omit<SessionProps, 'id' | 'createdAt' | 'token'>): Session {
    return new Session({
      ...props,
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      createdAt: new Date(),
    });
  }

  constructor(private readonly props: SessionProps) {
    super(props.id, props.createdAt, props.createdAt);
  }

  get userId(): string { return this.props.userId; }
  get token(): string { return this.props.token; }
  get ipAddress(): string | undefined { return this.props.ipAddress; }
  get userAgent(): string | undefined { return this.props.userAgent; }
  get expiresAt(): Date { return this.props.expiresAt; }

  get isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }
}
