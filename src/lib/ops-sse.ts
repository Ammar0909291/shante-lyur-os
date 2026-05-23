// Operational SSE — broadcasts real-time workflow events to all connected staff.
// Distinct from chat-sse.ts which handles user-to-user messaging.

type Controller = ReadableStreamDefaultController<Uint8Array>;

const clients = new Map<string, Set<Controller>>();
const encoder = new TextEncoder();

export interface OpsEvent {
  type:
    | 'connected'
    | 'client_arrived'
    | 'booking_confirmed'
    | 'booking_started'
    | 'booking_completed'
    | 'booking_cancelled'
    | 'booking_no_show'
    | 'room_assigned'
    | 'specialist_reassigned'
    | 'ops_refresh';
  appointmentId?: string;
  clientName?: string;
  specialistId?: string;
  specialistName?: string;
  roomName?: string;
  fromStatus?: string;
  toStatus?: string;
  message?: string;
  ts: string;
}

export function registerOpsClient(userId: string, ctrl: Controller) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(ctrl);
}

export function unregisterOpsClient(userId: string, ctrl: Controller) {
  clients.get(userId)?.delete(ctrl);
  if (clients.get(userId)?.size === 0) clients.delete(userId);
}

/** Broadcast to every connected staff member. */
export function broadcastOpsEvent(payload: OpsEvent) {
  const data = encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
  for (const [, set] of clients.entries()) {
    set.forEach((ctrl) => {
      try { ctrl.enqueue(data); } catch { /* client gone */ }
    });
  }
}

/** Push event to a specific user (e.g. specialist gets client-arrived). */
export function pushOpsEventToUser(userId: string, payload: OpsEvent) {
  const data = encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
  clients.get(userId)?.forEach((ctrl) => {
    try { ctrl.enqueue(data); } catch {}
  });
}

export function getConnectedUserIds(): string[] {
  return Array.from(clients.entries())
    .filter(([, s]) => s.size > 0)
    .map(([id]) => id);
}
