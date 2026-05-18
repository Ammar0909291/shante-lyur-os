import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors',
  {
    variants: {
      variant: {
        // Appointment statuses
        pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        confirmed: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        completed: 'bg-sage/10 text-sage border border-sage/20',
        cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
        noShow: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
        // Payment statuses
        paid: 'bg-sage/10 text-sage border border-sage/20',
        unpaid: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        refunded: 'bg-lavender/10 text-lavender border border-lavender/20',
        // Role badges
        admin: 'bg-champagne/10 text-champagne border border-champagne/20',
        specialist: 'bg-blush/10 text-blush border border-blush/20',
        receptionist: 'bg-lavender/10 text-lavender border border-lavender/20',
        // Loyalty tiers
        bronze: 'bg-orange-900/20 text-orange-400 border border-orange-500/20',
        silver: 'bg-zinc-500/10 text-zinc-300 border border-zinc-400/20',
        gold: 'bg-champagne/10 text-champagne border border-champagne/20',
        platinum: 'bg-lavender/10 text-lavender border border-lavender/20',
        // Generic
        default: 'bg-charcoal text-text-secondary border border-border-luxury',
        success: 'bg-sage/10 text-sage border border-sage/20',
        warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        error: 'bg-red-500/10 text-red-400 border border-red-500/20',
        info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

// Convenience mapping for appointment status
export function getAppointmentStatusBadgeVariant(
  status: string,
): VariantProps<typeof badgeVariants>['variant'] {
  const map: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_SHOW: 'noShow',
  };
  return map[status] ?? 'default';
}

export function getAppointmentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Ожидание',
    CONFIRMED: 'Подтверждено',
    COMPLETED: 'Завершено',
    CANCELLED: 'Отменено',
    NO_SHOW: 'Не явился',
  };
  return map[status] ?? status;
}

export function getSpecialistStatusBadgeVariant(
  status: string,
): VariantProps<typeof badgeVariants>['variant'] {
  const map: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
    ACTIVE:      'success',
    INACTIVE:    'warning',
    ON_VACATION: 'info',
    TERMINATED:  'error',
  };
  return map[status] ?? 'default';
}

export function getSpecialistStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE:      'Активен',
    INACTIVE:    'Неактивен',
    ON_VACATION: 'В отпуске',
    TERMINATED:  'Уволен',
  };
  return map[status] ?? status;
}

export function getPaymentStatusBadgeVariant(
  status: string,
): VariantProps<typeof badgeVariants>['variant'] {
  const map: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
    PAID: 'paid',
    UNPAID: 'unpaid',
    REFUNDED: 'refunded',
  };
  return map[status] ?? 'default';
}

export { Badge, badgeVariants };
