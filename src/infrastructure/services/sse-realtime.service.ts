import { RealtimeServicePort } from '@/application/ports/realtime-service.port';

interface Client {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
}

export class SSERealtimeService implements RealtimeServicePort {
  private clients: Map<string, Client> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30s
  private heartbeatTimer: NodeJS.Timeout | null = null;

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

  broadcastToUser(userId: string, payload: Record<string, unknown>): void {
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    Array.from(this.clients.values()).forEach(client => {
      if (client.userId === userId) {
        try { client.controller.enqueue(new TextEncoder().encode(message)); } catch { this.removeClient(client.id); }
      }
    });
  }

  broadcastToAll(payload: Record<string, unknown>): void {
    const message = `data: ${JSON.stringify(payload)}\n\n`;
    Array.from(this.clients.values()).forEach(client => {
      try { client.controller.enqueue(new TextEncoder().encode(message)); } catch { this.removeClient(client.id); }
    });
  }

  broadcastToRole(role: string, payload: Record<string, unknown>): void {
    // Role-based broadcasting requires user lookup — simplified here
    this.broadcastToAll(payload);
  }

  getConnectedUsers(): string[] {
    const userIds = new Set(Array.from(this.clients.values()).map(c => c.userId));
    return Array.from(userIds);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      Array.from(this.clients.values()).forEach(client => {
        if (now - client.lastPing > this.HEARTBEAT_INTERVAL * 2) {
          this.removeClient(client.id);
        } else {
          try {
            client.controller.enqueue(new TextEncoder().encode(':heartbeat\n\n'));
          } catch {
            this.removeClient(client.id);
          }
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  dispose(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    Array.from(this.clients.values()).forEach(client => {
      this.removeClient(client.id);
    });
  }
}
