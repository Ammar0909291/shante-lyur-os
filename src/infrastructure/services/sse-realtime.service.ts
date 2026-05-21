import { IRealtimeService } from '@/application/ports/realtime-service.port';

interface Client {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
  joinedAt: Date;
  channels: Set<string>;
}

export class SSERealtimeService implements IRealtimeService {
  private clients: Map<string, Client> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  // IRealtimeService interface methods

  broadcast(channel: string, event: string, payload: Record<string, unknown>): void {
    const message = `data: ${JSON.stringify({ event, ...payload })}\n\n`;
    for (const client of Array.from(this.clients.values())) {
      if (client.channels.has(channel)) {
        try { client.controller.enqueue(new TextEncoder().encode(message)); } catch { this.removeClient(client.id); }
      }
    }
  }

  subscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (client) client.channels.add(channel);
  }

  unsubscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (client) client.channels.delete(channel);
  }

  getPresence(channel: string): Array<{ clientId: string; joinedAt: Date }> {
    return Array.from(this.clients.values())
      .filter(c => c.channels.has(channel))
      .map(c => ({ clientId: c.id, joinedAt: c.joinedAt }));
  }

  // SSE-specific methods

  addClient(userId: string, controller: ReadableStreamDefaultController): string {
    const id = crypto.randomUUID();
    this.clients.set(id, { id, userId, controller, lastPing: Date.now(), joinedAt: new Date(), channels: new Set() });
    this.broadcastToUser(userId, { type: 'connected', clientId: id });
    return id;
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      try { client.controller.close(); } catch { /* ignore */ }
    }
  }

  broadcastToUser(userId: string, payload: Record<string, unknown>): void {
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of Array.from(this.clients.values())) {
      if (client.userId === userId) {
        try { client.controller.enqueue(new TextEncoder().encode(message)); } catch { this.removeClient(client.id); }
      }
    }
  }

  broadcastToAll(payload: Record<string, unknown>): void {
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of Array.from(this.clients.values())) {
      try { client.controller.enqueue(new TextEncoder().encode(message)); } catch { this.removeClient(client.id); }
    }
  }

  getConnectedUsers(): string[] {
    return Array.from(new Set(Array.from(this.clients.values()).map(c => c.userId)));
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const client of Array.from(this.clients.values())) {
        if (now - client.lastPing > this.HEARTBEAT_INTERVAL * 2) {
          this.removeClient(client.id);
        } else {
          try {
            client.controller.enqueue(new TextEncoder().encode(':heartbeat\n\n'));
          } catch {
            this.removeClient(client.id);
          }
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  dispose(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    for (const client of Array.from(this.clients.values())) {
      this.removeClient(client.id);
    }
  }
}
