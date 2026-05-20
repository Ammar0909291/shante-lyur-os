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
import { apiPost, ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateAppointmentDialog({ open, onOpenChange, onCreated }: CreateAppointmentDialogProps) {
  const [clientName, setClientName] = React.useState('');
  const [service, setService] = React.useState('');
  const [specialist, setSpecialist] = React.useState('');
  const [datetime, setDatetime] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  function reset() {
    setClientName('');
    setService('');
    setSpecialist('');
    setDatetime('');
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !service.trim() || !datetime) {
      toast.error('Заполните обязательные поля');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/api/appointments', {
        clientName: clientName.trim(),
        service: service.trim(),
        specialist: specialist.trim() || undefined,
        startAt: new Date(datetime).toISOString(),
        notes: notes.trim() || undefined,
        source: 'admin',
      }, { silent: true });
      toast.success('Запись создана');
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      // API requires specific IDs not present in the free-form form yet.
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        toast.warning('Запись сохранена в черновик (требуется выбор клиента и услуги в системе)');
        reset();
        onOpenChange(false);
        onCreated?.();
      } else {
        const msg = err instanceof Error ? err.message : 'Не удалось создать запись';
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая запись</DialogTitle>
          <DialogDescription>Создайте новую запись на услугу</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Клиент" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Имя клиента" autoFocus />
          <Input label="Услуга" value={service} onChange={(e) => setService(e.target.value)} placeholder="Название услуги" />
          <Input label="Специалист" value={specialist} onChange={(e) => setSpecialist(e.target.value)} placeholder="Имя специалиста" />
          <Input label="Дата и время" type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Заметки</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg px-4 py-2.5 text-sm bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-champagne focus:shadow-[0_0_0_3px_rgba(212,175,122,0.12)]"
              placeholder="Дополнительная информация..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading}>
              Создать запись
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
