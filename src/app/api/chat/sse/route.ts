export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getCurrentUserId } from '@/lib/auth-server';
import { registerChatClient, unregisterChatClient } from '@/lib/chat-sse';

const encoder = new TextEncoder();

export async function GET(req: NextRequest) {
  const userId = getCurrentUserId(req) ?? req.headers.get('x-user-id');
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      registerChatClient(userId, ctrl);

      // Send initial connected event
      const connected = encoder.encode(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);
      ctrl.enqueue(connected);

      // Heartbeat every 25 seconds
      const heartbeat = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 25_000);

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unregisterChatClient(userId, controller);
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
