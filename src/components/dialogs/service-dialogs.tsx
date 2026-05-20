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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ServiceLike {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  active: boolean;
  bookingsMonth?: number;
}

const categories = [
  { id: 'COSMETOLOGY', label: 'Косметология' },
  { id: 'MASSAGE', label: 'Массаж' },
  { id: 'INJECTION', label: 'Инъекции' },
  { id: 'LASER', label: 'Лазер' },
  { id: 'FACIAL', label: 'Уход за лицом' },
  { id: 'OTHER', label: 'Другое' },
];

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSaved,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceLike | null;
  onSaved?: (s: ServiceLike) => void;
  onDelete?: (id: string) => void;
}) {
  const isEdit = !!service;
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('COSMETOLOGY');
  const [price, setPrice] = React.useState('');
  const [duration, setDuration] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(service?.name ?? '');
      setCategory(service?.category ?? 'COSMETOLOGY');
      setPrice(service ? String(Math.round((service.price ?? 0) / 100)) : '');
      setDuration(service ? String(service.duration ?? 60) : '60');
      setConfirmDelete(false);
    }
  }, [open, service]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price || !duration) {
      toast.error('Заполните обязательные поля');
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    const saved: ServiceLike = {
      id: service?.id ?? Math.random().toString(36).slice(2),
      name: name.trim(),
      category,
      price: Math.round(parseFloat(price) * 100),
      duration: parseInt(duration, 10),
      active: service?.active ?? true,
      bookingsMonth: service?.bookingsMonth ?? 0,
    };
    toast.success(isEdit ? 'Услуга обновлена' : 'Услуга добавлена');
    onSaved?.(saved);
    setBusy(false);
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!service) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    toast.success('Услуга удалена');
    onDelete?.(service.id);
    setBusy(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать услугу' : 'Новая услуга'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Обновите параметры услуги' : 'Добавьте новую услугу в каталог'}
          </DialogDescription>
        </DialogHeader>

        {!confirmDelete && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Название" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-text-secondary">Категория</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Цена (₽)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="5000" />
              <Input label="Длительность (мин)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" />
            </div>
            <DialogFooter>
              {isEdit && (
                <Button type="button" variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
                  Удалить
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy}>
                Отмена
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={busy}>
                {isEdit ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {confirmDelete && service && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Удалить услугу <strong className="text-text-primary">{service.name}</strong>?
            </p>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={busy}>
                Отмена
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} isLoading={busy}>
                Удалить
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
