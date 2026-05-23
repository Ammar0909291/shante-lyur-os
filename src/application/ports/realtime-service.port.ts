export type RealtimeServicePort = IRealtimeService;

export interface IRealtimeService {
  broadcast(channel: string, event: string, payload: Record<string, unknown>): void;
  subscribe(clientId: string, channel: string): void;
  unsubscribe(clientId: string, channel: string): void;
  getPresence(channel: string): Array<{ clientId: string; joinedAt: Date }>;
}
