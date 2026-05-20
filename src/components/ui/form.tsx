'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function FormField({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex flex-col gap-1.5', className)}>{children}</div>;
}

export function FormLabel({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('text-xs font-semibold uppercase tracking-widest text-text-secondary', className)}
    >
      {children}
    </label>
  );
}

export function FormMessage({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p className={cn('text-xs text-red-400 flex items-center gap-1', className)}>
      <span aria-hidden="true">⚠</span>
      {children}
    </p>
  );
}

export function FormHint({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  return <p className={cn('text-xs text-text-tertiary', className)}>{children}</p>;
}
