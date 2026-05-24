export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { getCurrentUserId } from '@/lib/auth-server';
import { registerOpsClient, unregisterOpsClient, type OpsEvent } from '@/lib/ops-sse';

const encoder = new TextEncoder();

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      registerOpsClient(userId, ctrl);

      const connected: OpsEvent = { type: 'connected', ts: new Date().toISOString() };
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(connected)}\n\n`));

      const heartbeat = setInterval(() => {
        try { ctrl.enqueue(encoder.encode(': heartbeat\n\n')); } catch { clearInterval(heartbeat); }
      }, 25_000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unregisterOpsClient(userId, controller);
        try { ctrl.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
