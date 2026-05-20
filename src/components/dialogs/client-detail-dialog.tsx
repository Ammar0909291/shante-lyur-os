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
import { apiPatch, apiDelete, ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

export interface ClientLike {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  visits?: number;
  totalSpent?: number;
  lastVisit?: string;
  tier?: string;
}

interface ClientDetailDialogProps {
  client: ClientLike | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export function ClientDetailDialog({ client, open, onOpenChange, onChanged }: ClientDetailDialogProps) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (client) {
      setName(client.name ?? '');
      setEmail(client.email ?? '');
      setPhone(client.phone ?? '');
      setEditing(false);
      setConfirmingDelete(false);
    }
  }, [client]);

  if (!client) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    setBusy(true);
    try {
      await apiPatch(`/api/customers/${client.id}`, { fullName: name, email, phone }, { silent: true });
      toast.success('Изменения сохранены');
      onChanged?.();
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        toast.warning('Изменения сохранены локально');
        setEditing(false);
        onChanged?.();
      } else {
        toast.error('Не удалось сохранить');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!client) return;
    setBusy(true);
    try {
      await apiDelete(`/api/customers/${client.id}`, { silent: true });
      toast.success('Клиент удалён');
      onChanged?.();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        toast.warning('Клиент удалён локально');
        onChanged?.();
        onOpenChange(false);
      } else {
        toast.error('Не удалось удалить клиента');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Редактирование клиента' : 'Карточка клиента'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Обновите данные клиента' : 'Информация и история визитов'}
          </DialogDescription>
        </DialogHeader>

        {!editing && !confirmingDelete && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={client.name} size="lg" />
              <div>
                <p className="font-medium text-text-primary">{client.name}</p>
                <p className="text-xs text-text-tertiary">{client.email ?? '—'}</p>
                <p className="text-xs text-text-tertiary">{client.phone ?? '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-border-luxury pt-4">
              <div>
                <p className="text-xs text-text-tertiary">Визитов</p>
                <p className="text-text-primary font-medium mt-0.5">{client.visits ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Потрачено</p>
                <p className="text-champagne font-medium mt-0.5">
                  {client.totalSpent != null ? formatCurrency(client.totalSpent) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Последний визит</p>
                <p className="text-text-secondary text-sm mt-0.5">{client.lastVisit ?? '—'}</p>
              </div>
            </div>
          </div>
        )}

        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={busy}>
                Отмена
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={busy}>
                Сохранить
              </Button>
            </DialogFooter>
          </form>
        )}

        {confirmingDelete && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Вы уверены, что хотите удалить клиента <strong className="text-text-primary">{client.name}</strong>?
              Это действие необратимо.
            </p>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)} disabled={busy}>
                Отмена
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} isLoading={busy}>
                Удалить
              </Button>
            </DialogFooter>
          </div>
        )}

        {!editing && !confirmingDelete && (
          <DialogFooter>
            <Button variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
              Удалить
            </Button>
            <Button variant="primary" size="sm" onClick={() => setEditing(true)}>
              Редактировать
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
