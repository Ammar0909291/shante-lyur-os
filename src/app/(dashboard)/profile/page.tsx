'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Shield, Clock, LogOut, Edit2, Check, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { cn, formatCurrency } from '@/lib/utils';

interface MeData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Супер-администратор',
  ADMIN: 'Администратор',
  OPERATOR: 'Оператор',
  SPECIALIST: 'Специалист',
  CLIENT: 'Клиент',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Активен',
  INACTIVE: 'Неактивен',
  BLOCKED: 'Заблокирован',
};

const PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['Управление системой', 'Управление пользователями', 'Аналитика', 'Настройки', 'Финансы', 'Экспорт данных'],
  ADMIN: ['Управление записями', 'Управление клиентами', 'Управление специалистами', 'Аналитика', 'Настройки'],
  OPERATOR: ['Управление записями', 'Просмотр клиентов', 'Создание записей'],
  SPECIALIST: ['Просмотр своих записей', 'Управление расписанием'],
  CLIENT: ['Создание записей', 'Просмотр своих данных'],
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border-luxury last:border-0">
      <span className="text-text-tertiary shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-tertiary mb-0.5">{label}</p>
        <p className="text-sm text-text-primary">{value}</p>
      </div>
    </div>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = React.useState<MeData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');

  React.useEffect(() => {
    fetch('/api/admin/users/me')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setMe(json.data);
          setFirstName(json.data.firstName);
          setLastName(json.data.lastName);
          setPhone(json.data.phone ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = React.useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } finally {
      window.location.href = '/login';
    }
  }, []);

  const startEdit = () => {
    if (!me) return;
    setFirstName(me.firstName);
    setLastName(me.lastName);
    setPhone(me.phone ?? '');
    setSaveError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError('');
  };

  const saveEdit = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/admin/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || null,
        }),
      });
      const json = await res.json() as { success: boolean; data?: MeData; error?: { message?: string } };
      if (!res.ok) {
        setSaveError(json.error?.message ?? 'Ошибка сохранения');
        return;
      }
      setMe(json.data!);
      setEditing(false);
    } catch {
      setSaveError('Ошибка соединения');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = cn(
    'w-full px-3 py-2 rounded-xl bg-obsidian border border-border-luxury',
    'text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all',
  );

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-text-secondary">Не удалось загрузить профиль</p>
      </div>
    );
  }

  const fullName = `${me.firstName} ${me.lastName}`;
  const permissions = PERMISSIONS[me.role] ?? [];

  return (
    <div className="p-6 lg:p-8 animate-fade-in max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">Профиль</h2>
          <p className="text-text-secondary mt-1 text-sm">Учётная запись администратора</p>
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm',
            'border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors',
          )}
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: avatar + role */}
        <div className="bg-onyx border border-border-luxury rounded-2xl p-6 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-champagne/10 border border-champagne/30 flex items-center justify-center">
            <span className="text-2xl font-semibold text-champagne">
              {me.firstName[0]}{me.lastName[0]}
            </span>
          </div>

          {editing ? (
            <div className="w-full space-y-3">
              <div>
                <label className="block text-xs text-text-tertiary mb-1">Имя</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={saving}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-text-tertiary mb-1">Фамилия</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={saving}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-text-tertiary mb-1">Телефон</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7..."
                  disabled={saving}
                  className={inputCls}
                />
              </div>
              {saveError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{saveError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-champagne/10 border border-champagne/30 text-champagne text-sm hover:bg-champagne/20 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center">
                <p className="font-serif text-lg font-medium text-text-primary">{fullName}</p>
                <p className="text-sm text-champagne mt-0.5">{ROLE_LABEL[me.role] ?? me.role}</p>
                <span className={cn(
                  'inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium',
                  me.status === 'ACTIVE'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20',
                )}>
                  {STATUS_LABEL[me.status] ?? me.status}
                </span>
              </div>
              <button
                onClick={startEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border-luxury text-text-secondary text-sm hover:text-text-primary hover:bg-charcoal transition-colors w-full justify-center"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Редактировать
              </button>
            </>
          )}
        </div>

        {/* Right: info + permissions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact info */}
          <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
            <h3 className="font-serif text-base font-medium text-text-primary mb-1">Контактная информация</h3>
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={me.email} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Телефон" value={me.phone ?? '—'} />
            <InfoRow icon={<Shield className="w-4 h-4" />} label="Роль" value={ROLE_LABEL[me.role] ?? me.role} />
            <InfoRow icon={<Clock className="w-4 h-4" />} label="Последний вход" value={formatDateTime(me.lastLoginAt)} />
            <InfoRow icon={<User className="w-4 h-4" />} label="Дата регистрации" value={formatDateTime(me.createdAt)} />
            <div className="flex items-center gap-3 pt-3">
              <span className="text-text-tertiary shrink-0"><User className="w-4 h-4" /></span>
              <div className="flex-1">
                <p className="text-xs text-text-tertiary mb-0.5">Локация</p>
                <p className="text-sm text-text-primary">Shante Lyur — Екатеринбург, ул. Малышева, 3</p>
              </div>
            </div>
          </div>

          {/* Permissions */}
          {permissions.length > 0 && (
            <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
              <h3 className="font-serif text-base font-medium text-text-primary mb-4">Права доступа</h3>
              <div className="flex flex-wrap gap-2">
                {permissions.map((perm) => (
                  <span
                    key={perm}
                    className="px-3 py-1 rounded-full text-xs border border-champagne/20 bg-champagne/5 text-champagne"
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
