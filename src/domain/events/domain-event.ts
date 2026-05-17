export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly occurredAt: Date;
  readonly version: number;
  readonly payload: Record<string, unknown>;
}

export abstract class BaseDomainEvent implements DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly version: number = 1;

  constructor(
    readonly eventType: string,
    readonly aggregateId: string,
    readonly aggregateType: string,
    readonly payload: Record<string, unknown>,
    options?: { eventId?: string; occurredAt?: Date; version?: number }
  ) {
    this.eventId = options?.eventId ?? crypto.randomUUID();
    this.occurredAt = options?.occurredAt ?? new Date();
    this.version = options?.version ?? 1;
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      payload: this.payload,
    };
  }
}
