import type { IEventBus } from '@/application/ports';
import type { DomainEvent } from '@/domain/events';

type EventHandler = (event: DomainEvent) => Promise<void>;

class SyncEventBus implements IEventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  subscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler]);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, existing.filter(h => h !== handler));
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[EventBus] Handler error for ${event.eventType}:`, err);
      }
    }
  }
}

export const eventBus = new SyncEventBus();
