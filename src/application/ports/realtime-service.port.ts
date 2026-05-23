export type RealtimeServicePort = IRealtimeService;

export interface IRealtimeService {
  broadcast?(channel: string, event: string, payload: Record<string, unknown>): void;
  subscribe?(clientId: string, channel: string): void;
  unsubscribe?(clientId: string, channel: string): void;
  getPresence?(channel: string): Array<{ clientId: string; joinedAt: Date }>;
  addClient?(userId: string, controller: ReadableStreamDefaultController): string;
  removeClient?(clientId: string): void;
  broadcastToUser?(userId: string, payload: Record<string, unknown>): void;
  broadcastToAll?(payload: Record<string, unknown>): void;
  broadcastToRole?(role: string, payload: Record<string, unknown>): void;
  getConnectedUsers?(): string[];
  getClientCount?(): number;
}
