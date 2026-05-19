import { RealtimeServicePort } from '@/application/ports/realtime-service.port';

interface Client {
  id: string;
  userId: string;
  channels: Set<string>;
  controller: ReadableStreamDefaultController;
  joinedAt: Date;
  lastPing: number;
}

export class SSERealtimeService implements RealtimeServicePort {
  private clients: Map<string, Client> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  addClient(userId: string, controller: ReadableStreamDefaultController): string {
    const id = crypto.randomUUID();
    this.clients.set(id, { id, userId, channels: new Set(), controller, joinedAt: new Date(), lastPing: Date.now() });
    this.broadcast(`user:${userId}`, 'connected', { clientId: id });
    return id;
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      try { client.controller.close(); } catch { /* ignore */ }
    }
  }

  broadcast(channel: string, event: string, payload: Record<string, unknown>): void {
    const message = `event: ${event}\ndata: ${JSON.stringify({ channel, ...payload })}\n\n`;
    const encoder = new TextEncoder();
    for (const client of Array.from(this.clients.values())) {
      if (client.channels.has(channel) || channel.startsWith(`user:${client.userId}`)) {
        try {
          client.controller.enqueue(encoder.encode(message));
        } catch {
          this.removeClient(client.id);
        }
      }
    }
  }

  subscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.channels.add(channel);
    }
  }

  unsubscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.channels.delete(channel);
    }
  }

  getPresence(channel: string): Array<{ clientId: string; joinedAt: Date }> {
    return Array.from(this.clients.values())
      .filter(c => c.channels.has(channel))
      .map(c => ({ clientId: c.id, joinedAt: c.joinedAt }));
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
      const encoder = new TextEncoder();
      for (const client of Array.from(this.clients.values())) {
        if (now - client.lastPing > this.HEARTBEAT_INTERVAL * 2) {
          this.removeClient(client.id);
        } else {
          try {
            client.controller.enqueue(encoder.encode(':heartbeat\n\n'));
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
