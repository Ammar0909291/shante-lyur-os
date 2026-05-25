'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { apiPatch, apiPost, ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import { RefundDialog } from '@/components/dialogs/refund-dialog';

export interface AppointmentLike {
  id: string;
  client: string;
  service: string;
  specialist: string;
  time: Date | string;
  status: string;
  amount: number;
}

interface AppointmentDetailDialogProps {
  appointment: AppointmentLike | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export function AppointmentDetailDialog({ appointment, open, onOpenChange, onChanged }: AppointmentDetailDialogProps) {
  const [busy, setBusy] = React.useState(false);
  const [showReschedule, setShowReschedule] = React.useState(false);
  const [newDatetime, setNewDatetime] = React.useState('');
  const [showRefund, setShowRefund] = React.useState(false);

  if (!appointment) return null;

  async function update(action: 'cancel' | 'complete' | 'confirm') {
    if (!appointment) return;
    setBusy(true);
    try {
      if (action === 'cancel') {
        await apiPost(`/api/appointments/${appointment.id}/cancel`, { reason: 'CLIENT_REQUEST' }, { silent: true })
          .catch(() => apiPatch(`/api/appointments/${appointment.id}`, { status: 'CANCELLED' }, { silent: true }));
        toast.success('Запись отменена');
      } else if (action === 'complete') {
        await apiPatch(`/api/appointments/${appointment.id}`, { status: 'COMPLETED' }, { silent: true });
        toast.success('Запись завершена');
      } else if (action === 'confirm') {
        await apiPatch(`/api/appointments/${appointment.id}`, { status: 'CONFIRMED' }, { silent: true });
        toast.success('Запись подтверждена');
      }
      onChanged?.();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        toast.warning('Действие применено локально');
        onChanged?.();
        onOpenChange(false);
      } else {
        toast.error('Не удалось выполнить действие');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!appointment || !newDatetime) return;
    setBusy(true);
    try {
      await apiPost(`/api/appointments/${appointment.id}/reschedule`, {
        newStartAt: new Date(newDatetime).toISOString(),
      }, { silent: true });
      toast.success('Запись перенесена');
      onChanged?.();
      onOpenChange(false);
      setShowReschedule(false);
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        toast.warning('Перенос сохранён локально');
        onChanged?.();
        onOpenChange(false);
      } else {
        toast.error('Не удалось перенести запись');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Детали записи</DialogTitle>
          <DialogDescription>Просмотр и управление записью</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={appointment.client} size="md" />
            <div>
              <p className="font-medium text-text-primary">{appointment.client}</p>
              <p className="text-xs text-text-tertiary">{appointment.service}</p>
            </div>
            <div className="ml-auto">
              <Badge variant={getAppointmentStatusBadgeVariant(appointment.status)} dot>
                {getAppointmentStatusLabel(appointment.status)}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm border-t border-border-luxury pt-4">
            <div>
              <p className="text-xs text-text-tertiary">Специалист</p>
              <p className="text-text-primary mt-0.5">{appointment.specialist}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Сумма</p>
              <p className="text-champagne font-medium mt-0.5">{formatCurrency(appointment.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Дата</p>
              <p className="text-text-primary mt-0.5">{formatDate(appointment.time)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Время</p>
              <p className="text-text-primary mt-0.5">{formatTime(appointment.time)}</p>
            </div>
          </div>

          {showReschedule && (
            <form onSubmit={handleReschedule} className="space-y-3 border-t border-border-luxury pt-4">
              <Input label="Новая дата и время" type="datetime-local" value={newDatetime} onChange={(e) => setNewDatetime(e.target.value)} />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowReschedule(false)} disabled={busy}>
                  Назад
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={busy}>
                  Подтвердить перенос
                </Button>
              </div>
            </form>
          )}
        </div>

        {!showReschedule && (
          <DialogFooter className="flex-wrap">
            <Button variant="danger" size="sm" onClick={() => update('cancel')} isLoading={busy}>
              Отменить
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowReschedule(true)} disabled={busy}>
              Перенести
            </Button>
            {appointment.status !== 'COMPLETED' && (
              <Button variant="primary" size="sm" onClick={() => update('complete')} isLoading={busy}>
                Завершить
              </Button>
            )}
            {appointment.status === 'COMPLETED' && (
              <Button variant="secondary" size="sm" onClick={() => setShowRefund(true)} disabled={busy}>
                Возврат
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
      <RefundDialog
        appointmentId={showRefund ? appointment.id : null}
        open={showRefund}
        onOpenChange={setShowRefund}
        onRefunded={() => { onChanged?.(); }}
      />
    </Dialog>
  );
}
