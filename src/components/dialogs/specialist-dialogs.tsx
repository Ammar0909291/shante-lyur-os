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
import { Avatar } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';

export interface SpecialistLike {
  id: string;
  name: string;
  specialization?: string;
  rating?: number;
  reviews?: number;
  appointmentsMonth?: number;
  status?: string;
  services?: string[];
}

export function CreateSpecialistDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [name, setName] = React.useState('');
  const [specialization, setSpecialization] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Введите имя');
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    toast.success('Специалист добавлен');
    setBusy(false);
    setName(''); setSpecialization(''); setEmail(''); setPhone('');
    onOpenChange(false);
    onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый специалист</DialogTitle>
          <DialogDescription>Добавьте нового специалиста в команду</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <Input label="Специализация" value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Косметолог-эстетист" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={busy}>
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SpecialistDetailDialog({
  specialist,
  open,
  onOpenChange,
}: {
  specialist: SpecialistLike | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!specialist) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{specialist.name}</DialogTitle>
          <DialogDescription>{specialist.specialization}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={specialist.name} size="lg" />
            <div className="flex-1">
              <p className="text-sm text-text-primary font-medium">{specialist.name}</p>
              <p className="text-xs text-text-tertiary">{specialist.specialization}</p>
              <p className="text-xs text-text-secondary mt-1">
                Рейтинг: {specialist.rating ?? '—'} · {specialist.reviews ?? 0} отзывов
              </p>
            </div>
          </div>

          {specialist.services && specialist.services.length > 0 && (
            <div className="border-t border-border-luxury pt-4">
              <p className="text-xs text-text-tertiary mb-2">Услуги</p>
              <div className="flex flex-wrap gap-1.5">
                {specialist.services.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-charcoal text-text-secondary border border-border-luxury">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border-luxury pt-4">
            <p className="text-xs text-text-tertiary mb-1">Записей в месяц</p>
            <p className="text-text-primary font-medium">{specialist.appointmentsMonth ?? 0}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={() => toast('Раздел в разработке')}>
            Расписание
          </Button>
          <Button variant="primary" size="sm" onClick={() => toast('Редактирование скоро будет доступно')}>
            Редактировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
