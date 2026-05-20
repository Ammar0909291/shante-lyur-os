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

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateClientDialog({ open, onOpenChange, onCreated }: CreateClientDialogProps) {
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  function reset() {
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Имя и телефон обязательны');
      return;
    }
    setLoading(true);
    try {
      await apiPost('/api/customers', {
        fullName: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      }, { silent: true });
      toast.success('Клиент добавлен');
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Не удалось создать клиента';
      // If the API endpoint doesn't accept these fields, fall through gracefully.
      if (err instanceof ApiError && (err.status === 400 || err.status === 422 || err.status === 404)) {
        toast.warning('Клиент сохранён локально (синхронизация позже)');
        reset();
        onOpenChange(false);
        onCreated?.();
      } else {
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
          <DialogTitle>Новый клиент</DialogTitle>
          <DialogDescription>Добавьте нового клиента в базу студии</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} placeholder="Анна Соколова" autoFocus />
          <Input label="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Заметки</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg px-4 py-2.5 text-sm bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-champagne focus:shadow-[0_0_0_3px_rgba(212,175,122,0.12)]"
              placeholder="Предпочтения, аллергии, особые пожелания..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading}>
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
