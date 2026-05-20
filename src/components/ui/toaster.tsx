'use client';

import * as React from 'react';
import { Toast, ToastProvider, ToastViewport } from './toast';
import { useToasts, dismissToast } from '@/hooks/use-toast';

export function Toaster() {
  const toasts = useToasts();

  return (
    <ToastProvider swipeDirection="right" duration={4500}>
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          title={t.title}
          description={t.description}
          onOpenChange={(open) => {
            if (!open) dismissToast(t.id);
          }}
        />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
