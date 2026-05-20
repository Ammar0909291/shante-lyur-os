'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToastVariant } from '@/hooks/use-toast';

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)] w-96',
      'outline-none',
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = 'ToastViewport';

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border-luxury',
  success: 'border-emerald-500/40',
  error: 'border-red-500/50',
  warning: 'border-amber-500/40',
};

const variantIcon: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="w-4 h-4 text-champagne" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  error: <AlertCircle className="w-4 h-4 text-red-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
};

interface ToastRootProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: ToastVariant;
  title?: string;
  description?: string;
}

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastRootProps
>(({ className, variant = 'default', title, description, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      'group relative flex items-start gap-3 p-4 pr-10 rounded-xl',
      'bg-onyx border shadow-luxury-lg',
      'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-80',
      'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
      'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full',
      variantStyles[variant],
      className,
    )}
    {...props}
  >
    <span className="shrink-0 mt-0.5">{variantIcon[variant]}</span>
    <div className="flex-1 min-w-0">
      {title && (
        <ToastPrimitive.Title className="text-sm font-medium text-text-primary">
          {title}
        </ToastPrimitive.Title>
      )}
      {description && (
        <ToastPrimitive.Description className="text-xs text-text-secondary mt-0.5">
          {description}
        </ToastPrimitive.Description>
      )}
    </div>
    <ToastPrimitive.Close
      className="absolute right-2 top-2 p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
      aria-label="Закрыть"
    >
      <X className="w-3.5 h-3.5" />
    </ToastPrimitive.Close>
  </ToastPrimitive.Root>
));
Toast.displayName = 'Toast';
