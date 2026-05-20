'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { UserX, Trash2, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  clientId: string;
  currentStatus: string;
}

export function ClientActions({ clientId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<'disable' | 'delete' | null>(null);

  const isDisabled = currentStatus === 'INACTIVE' || currentStatus === 'SUSPENDED';

  const handleDisable = async () => {
    setLoading('disable');
    try {
      await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: isDisabled ? 'ACTIVE' : 'INACTIVE' }),
      });
      router.refresh();
    } finally {
      setLoading(null);
      setConfirm(null);
    }
  };

  const handleDelete = async () => {
    setLoading('delete');
    try {
      await fetch(`/api/admin/clients/${clientId}`, { method: 'DELETE' });
      router.push('/clients');
    } finally {
      setLoading(null);
      setConfirm(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {confirm === 'disable' && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs text-yellow-400">
          <span>{isDisabled ? 'Активировать клиента?' : 'Отключить клиента?'}</span>
          <button onClick={handleDisable} disabled={!!loading} className="font-semibold hover:text-yellow-300">Да</button>
          <button onClick={() => setConfirm(null)} className="hover:text-text-secondary">Нет</button>
        </div>
      )}
      {confirm === 'delete' && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
          <span>Архивировать клиента?</span>
          <button onClick={handleDelete} disabled={!!loading} className="font-semibold hover:text-red-300">Да</button>
          <button onClick={() => setConfirm(null)} className="hover:text-text-secondary">Нет</button>
        </div>
      )}

      {!confirm && (
        <>
          <button
            onClick={() => setConfirm('disable')}
            disabled={!!loading}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors',
              isDisabled
                ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                : 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10',
            )}
          >
            {isDisabled ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
            {isDisabled ? 'Активировать' : 'Отключить'}
          </button>

          <button
            onClick={() => setConfirm('delete')}
            disabled={!!loading || currentStatus === 'SUSPENDED'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Удалить
          </button>
        </>
      )}
    </div>
  );
}
