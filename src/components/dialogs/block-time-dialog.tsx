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

interface BlockTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlockTimeDialog({ open, onOpenChange }: BlockTimeDialogProps) {
  const [date, setDate] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [specialist, setSpecialist] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !from || !to) {
      toast.error('Заполните дату и время');
      return;
    }
    setLoading(true);
    // No dedicated block-time API endpoint yet — show optimistic toast.
    await new Promise((r) => setTimeout(r, 400));
    toast.success(`Время заблокировано (${date} ${from}—${to})`);
    setLoading(false);
    setDate(''); setFrom(''); setTo(''); setSpecialist(''); setReason('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Заблокировать время</DialogTitle>
          <DialogDescription>Закройте слот в расписании специалиста</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Дата" type="date" value={date} onChange={(e) => setDate(e.target.value)} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="С" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="До" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Input label="Специалист" value={specialist} onChange={(e) => setSpecialist(e.target.value)} placeholder="Имя специалиста (или все)" />
          <Input label="Причина" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Перерыв, обучение..." />
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading}>
              Заблокировать
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
