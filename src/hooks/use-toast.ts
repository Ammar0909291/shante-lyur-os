'use client';

// Lightweight toast store. Implemented as a tiny pub/sub so we don't depend on
// React context being mounted before `toast()` is called.

import * as React from 'react';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type Listener = (toasts: ToastItem[]) => void;

const listeners = new Set<Listener>();
let toasts: ToastItem[] = [];

function notify() {
  listeners.forEach((l) => l(toasts));
}

function add(t: Omit<ToastItem, 'id'>) {
  const id = Math.random().toString(36).slice(2);
  const item: ToastItem = { id, duration: 4500, variant: 'default', ...t };
  toasts = [...toasts, item];
  notify();
  if (item.duration && item.duration > 0) {
    setTimeout(() => remove(id), item.duration);
  }
  return id;
}

function remove(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function toast(input: Omit<ToastItem, 'id'> | string): string {
  if (typeof input === 'string') return add({ description: input });
  return add(input);
}

toast.success = (msg: string, title?: string) =>
  add({ title: title ?? 'Готово', description: msg, variant: 'success' });
toast.error = (msg: string, title?: string) =>
  add({ title: title ?? 'Ошибка', description: msg, variant: 'error' });
toast.warning = (msg: string, title?: string) =>
  add({ title: title ?? 'Внимание', description: msg, variant: 'warning' });

export function useToasts(): ToastItem[] {
  const [state, setState] = React.useState<ToastItem[]>(toasts);
  React.useEffect(() => {
    const listener: Listener = (next) => setState(next);
    listeners.add(listener);
    setState(toasts);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return state;
}

export function dismissToast(id: string): void {
  remove(id);
}
