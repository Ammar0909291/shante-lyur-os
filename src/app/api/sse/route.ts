export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { DIRegistry } from '@/infrastructure/config/di-registry';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const registry = DIRegistry.instance;

  const stream = new ReadableStream({
    start(controller) {
      const clientId = registry.realtimeService.addClient(userId, controller);

      // Subscribe client to shared channels
      registry.realtimeService.subscribe(clientId, 'appointments');
      registry.realtimeService.subscribe(clientId, 'messages');
      registry.realtimeService.subscribe(clientId, 'notifications');

      // Clean up when the connection closes
      req.signal.addEventListener('abort', () => {
        registry.realtimeService.removeClient(clientId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
