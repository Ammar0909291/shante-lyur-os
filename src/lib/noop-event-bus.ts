import type { IEventBus } from '@/application/ports';
import type { DomainEvent } from '@/domain/events';

export const noopEventBus: IEventBus = {
  async publish(_event: DomainEvent): Promise<void> {},
  subscribe(_eventType: string, _handler: (event: DomainEvent) => Promise<void>): void {},
};
