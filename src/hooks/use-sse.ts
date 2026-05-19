'use client';

import * as React from 'react';
import { useAuth } from '@/context/auth-context';

export type SSEPayload = { channel?: string; [key: string]: unknown };
export type SSECallback = (eventType: string, payload: SSEPayload) => void;

export function useSSE(onEvent: SSECallback): void {
  const { user } = useAuth();
  const onEventRef = React.useRef(onEvent);
  onEventRef.current = onEvent;

  React.useEffect(() => {
    if (!user) return;

    let es: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;
    let retryDelay = 1000;
    let active = true;

    function connect() {
      if (!active) return;
      es = new EventSource('/api/sse');

      es.onopen = () => {
        retryDelay = 1000;
      };

      es.onerror = () => {
        es.close();
        if (!active) return;
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30_000);
          connect();
        }, retryDelay);
      };

      for (const eventType of ['connected', 'chat', 'appointment:updated', 'notification']) {
        es.addEventListener(eventType, (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data as string) as SSEPayload;
            onEventRef.current(eventType, payload);
          } catch { /* malformed frame — ignore */ }
        });
      }
    }

    connect();
    return () => {
      active = false;
      clearTimeout(retryTimer);
      es?.close();
    };
  }, [user]);
}
