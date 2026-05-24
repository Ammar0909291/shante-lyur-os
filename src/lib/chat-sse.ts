type Controller = ReadableStreamDefaultController<Uint8Array>;

const clients = new Map<string, Set<Controller>>();
const encoder = new TextEncoder();

export function registerChatClient(userId: string, ctrl: Controller) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(ctrl);
}

export function unregisterChatClient(userId: string, ctrl: Controller) {
  clients.get(userId)?.delete(ctrl);
}

export function pushChatEvent(userId: string, payload: unknown) {
  const data = encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
  clients.get(userId)?.forEach((ctrl) => {
    try { ctrl.enqueue(data); } catch {}
  });
}

export function getOnlineUserIds(): string[] {
  return Array.from(clients.entries())
    .filter(([, set]) => set.size > 0)
    .map(([id]) => id);
}
