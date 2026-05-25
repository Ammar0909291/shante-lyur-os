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
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface RefundItem {
  id:        string;
  amount:    number;
  status:    string;
  reason:    string | null;
  createdAt: string;
}

interface PaymentInfo {
  id:               string;
  amount:           number;
  currency:         string;
  provider:         string;
  refundedAmount:   number;
  refundableAmount: number;
  refunds:          RefundItem[];
}

interface RefundDialogProps {
  appointmentId: string | null;
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  onRefunded?:   () => void;
}

const STATUS_LABEL: Record<string, string> = {
  COMPLETED:  'Выполнен',
  PENDING:    'Ожидание',
  PROCESSING: 'В обработке',
  FAILED:     'Ошибка',
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED:  'text-emerald-400',
  PENDING:    'text-amber-400',
  PROCESSING: 'text-blue-400',
  FAILED:     'text-red-400',
};

export function RefundDialog({ appointmentId, open, onOpenChange, onRefunded }: RefundDialogProps) {
  const [payment,  setPayment]  = React.useState<PaymentInfo | null>(null);
  const [loading,  setLoading]  = React.useState(false);
  const [busy,     setBusy]     = React.useState(false);
  const [amount,   setAmount]   = React.useState('');
  const [reason,   setReason]   = React.useState('');
  const [amtError, setAmtError] = React.useState('');

  React.useEffect(() => {
    if (!open || !appointmentId) return;
    setPayment(null);
    setAmount('');
    setReason('');
    setAmtError('');
    setLoading(true);

    fetch(`/api/v1/bookings/${appointmentId}/payment`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setPayment(json.data as PaymentInfo);
          setAmount(String(json.data.refundableAmount));
        } else {
          toast.error(json.error?.message ?? 'Платёж не найден');
          onOpenChange(false);
        }
      })
      .catch(() => { toast.error('Ошибка загрузки'); onOpenChange(false); })
      .finally(() => setLoading(false));
  }, [open, appointmentId, onOpenChange]);

  function validateAmount(val: string): boolean {
    const n = parseFloat(val);
    if (!payment) return false;
    if (isNaN(n) || n <= 0) { setAmtError('Введите сумму больше 0'); return false; }
    if (n > payment.refundableAmount) {
      setAmtError(`Максимум: ${formatCurrency(payment.refundableAmount)}`);
      return false;
    }
    setAmtError('');
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payment) return;
    if (!validateAmount(amount)) return;
    if (!reason.trim()) { toast.error('Укажите причину возврата'); return; }

    setBusy(true);
    try {
      const res  = await fetch(`/api/v1/payments/${payment.id}/refund`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: parseFloat(amount), reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? 'Ошибка возврата');
        return;
      }
      toast.success(`Возврат ${formatCurrency(parseFloat(amount))} инициирован`);
      onRefunded?.();
      onOpenChange(false);
    } catch {
      toast.error('Ошибка сети');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Оформить возврат</DialogTitle>
          <DialogDescription>Возврат средств клиенту через платёжный шлюз</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-8 text-center text-sm text-text-muted">Загрузка данных платежа…</div>
        )}

        {!loading && payment && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment summary */}
            <div className="rounded-xl bg-charcoal border border-border-luxury p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Оплачено</span>
                <span className="text-text-primary font-medium">{formatCurrency(payment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Возвращено</span>
                <span className="text-text-secondary">{formatCurrency(payment.refundedAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-border-luxury pt-1 mt-1">
                <span className="text-text-muted">Доступно к возврату</span>
                <span className="text-champagne font-semibold">{formatCurrency(payment.refundableAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Шлюз</span>
                <span className="text-text-secondary">{payment.provider}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <Input
                label="Сумма возврата"
                type="number"
                step="0.01"
                min="0.01"
                max={payment.refundableAmount}
                value={amount}
                onChange={(e) => { setAmount(e.target.value); validateAmount(e.target.value); }}
                required
              />
              {amtError && <p className="text-xs text-red-400">{amtError}</p>}
              <input
                type="range"
                min={0}
                max={payment.refundableAmount}
                step={0.01}
                value={parseFloat(amount) || 0}
                onChange={(e) => { setAmount(e.target.value); validateAmount(e.target.value); }}
                className="w-full accent-champagne"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary">Причина возврата</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Укажите причину…"
                required
                className="w-full rounded-lg border border-border-luxury bg-obsidian px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-champagne/40 resize-none"
              />
              <p className="text-[11px] text-text-muted text-right">{reason.length}/2000</p>
            </div>

            {/* Existing refunds */}
            {payment.refunds.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-text-secondary">История возвратов</p>
                <div className="space-y-1">
                  {payment.refunds.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-charcoal border border-border-luxury">
                      <div>
                        <span className={STATUS_COLOR[r.status] ?? 'text-text-muted'}>{STATUS_LABEL[r.status] ?? r.status}</span>
                        {r.reason && <span className="text-text-muted ml-2 truncate max-w-[160px] inline-block align-bottom">{r.reason}</span>}
                      </div>
                      <span className="text-text-secondary shrink-0 ml-2">{formatCurrency(r.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
                Отмена
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={busy}
                disabled={payment.refundableAmount <= 0}
              >
                Оформить возврат
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
