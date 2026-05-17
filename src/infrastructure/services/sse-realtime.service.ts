import { IRealtimeService } from '@/application/ports/realtime-service.port';

interface Client {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
}

export class SSERealtimeService implements IRealtimeService {
  private clients: Map<string, Client> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30s
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, Set<string>> = new Map(); // channel -> Set<clientId>

  constructor() {
    this.startHeartbeat();
  }

  addClient(userId: string, controller: ReadableStreamDefaultController): string {
    const id = crypto.randomUUID();
    this.clients.set(id, { id, userId, controller, lastPing: Date.now() });
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

  broadcast(channel: string, event: string, payload: Record<string, unknown>): void {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) return;
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    const encoder = new TextEncoder();
    for (const clientId of Array.from(subscribers)) {
      const client = this.clients.get(clientId);
      if (client) {
        try { client.controller.enqueue(encoder.encode(message)); } catch { this.removeClient(clientId); }
      }
    }
  }

  subscribe(clientId: string, channel: string): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(clientId);
  }

  unsubscribe(clientId: string, channel: string): void {
    const subs = this.subscriptions.get(channel);
    if (subs) subs.delete(clientId);
  }

  getPresence(channel: string): Array<{ clientId: string; joinedAt: Date }> {
    const subs = this.subscriptions.get(channel);
    if (!subs) return [];
    return Array.from(subs).map(clientId => ({ clientId, joinedAt: new Date() }));
  }

  broadcastToUser(userId: string, payload: Record<string, unknown>): void {
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    const encoder = new TextEncoder();
    for (const client of Array.from(this.clients.values())) {
      if (client.userId === userId) {
        try { client.controller.enqueue(encoder.encode(message)); } catch { this.removeClient(client.id); }
      }
    }
  }

  broadcastToAll(payload: Record<string, unknown>): void {
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    const encoder = new TextEncoder();
    for (const client of Array.from(this.clients.values())) {
      try { client.controller.enqueue(encoder.encode(message)); } catch { this.removeClient(client.id); }
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
