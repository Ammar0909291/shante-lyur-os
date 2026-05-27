'use client';

import * as React from 'react';
import {
  ShieldCheck, Search, RefreshCw, ChevronDown,
  User, AlertTriangle, Check, X, UserPlus, ClipboardList,
  Loader2, Eye, EyeOff, KeyRound, Lock, Unlock, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';
import { getClientRole, getClientUserId } from '@/lib/client-auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'COSMETOLOGIST' | 'MASSAGIST' | 'CLIENT';
type PageTab  = 'users' | 'audit';

interface StaffUser {
  id: string; firstName: string; lastName: string; email: string;
  role: UserRole; status: string; lastLoginAt: string | null; createdAt: string;
}
interface ApiUser extends Omit<StaffUser, 'role'> { role: string; }

interface AuditEntry {
  id: string; action: string; entityType: string; entityId: string | null;
  ipAddress: string | null; createdAt: string;
  user: { name: string; email: string; role: string } | null;
}

interface GrantRecord {
  id: string;
  resource: string;
  grantedAt: string;
  note: string | null;
  grantedBy: { firstName: string; lastName: string; email: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES: UserRole[] = ['SUPER_ADMIN','ADMIN','MANAGER','RECEPTIONIST','COSMETOLOGIST','MASSAGIST'];

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN:   { label: 'Супер-администратор', color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/30' },
  ADMIN:         { label: 'Администратор',        color: 'text-champagne',   bg: 'bg-champagne/10 border-champagne/30' },
  MANAGER:       { label: 'Менеджер',             color: 'text-blue-400',    bg: 'bg-blue-400/10 border-blue-400/30' },
  RECEPTIONIST:  { label: 'Администратор стойки', color: 'text-teal-400',    bg: 'bg-teal-400/10 border-teal-400/30' },
  COSMETOLOGIST: { label: 'Косметолог',           color: 'text-purple-400',  bg: 'bg-purple-400/10 border-purple-400/30' },
  MASSAGIST:     { label: 'Массажист',            color: 'text-green-400',   bg: 'bg-green-400/10 border-green-400/30' },
  CLIENT:        { label: 'Клиент',               color: 'text-text-tertiary', bg: 'bg-charcoal border-border-luxury' },
};

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN:   ['Все разрешения', 'Управление правами', 'Финансы', 'Отчёты', 'Настройки системы'],
  ADMIN:         ['Бронирования', 'Клиенты', 'Специалисты', 'Услуги', 'Аналитика', 'Финансы', 'Настройки'],
  MANAGER:       ['Бронирования', 'Клиенты', 'Услуги', 'Аналитика', 'Продажи', 'Склад', 'Промокоды'],
  RECEPTIONIST:  ['Бронирования', 'Клиенты', 'Стойка администратора'],
  COSMETOLOGIST: ['Свои записи', 'Расписание', 'Процедуры клиентов'],
  MASSAGIST:     ['Свои записи', 'Расписание', 'Процедуры клиентов'],
  CLIENT:        ['Свои бронирования', 'Личные данные'],
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Создание', UPDATE: 'Изменение', DELETE: 'Удаление',
  LOGIN: 'Вход', LOGOUT: 'Выход', LOGIN_FAILED: 'Неудача входа',
  PASSWORD_CHANGED: 'Смена пароля', ROLE_CHANGED: 'Смена роли',
  STATUS_CHANGED: 'Смена статуса', PAYMENT_PROCESSED: 'Оплата',
  REFUND_ISSUED: 'Возврат', EXPORT: 'Экспорт', IMPORT: 'Импорт',
  SETTINGS_CHANGED: 'Настройки',
};

/** All CRM resources that can be individually granted to a user. */
const GRANTABLE_RESOURCES: { resource: string; label: string; defaultRoles: UserRole[] }[] = [
  { resource: '/dashboard',      label: 'Дашборд',                    defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER','RECEPTIONIST'] },
  { resource: '/operations',     label: 'Операции',                   defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER','RECEPTIONIST'] },
  { resource: '/receptionist',   label: 'Стойка администратора',      defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER','RECEPTIONIST'] },
  { resource: '/bookings',       label: 'Бронирования',               defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER','RECEPTIONIST','COSMETOLOGIST','MASSAGIST'] },
  { resource: '/clients',        label: 'Клиенты',                    defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER','RECEPTIONIST'] },
  { resource: '/specialists',    label: 'Специалисты',                defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER','RECEPTIONIST'] },
  { resource: '/services',       label: 'Услуги',                     defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER','RECEPTIONIST'] },
  { resource: '/analytics',      label: 'Аналитика',                  defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER','RECEPTIONIST'] },
  { resource: '/sales',          label: 'Продажи',                    defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
  { resource: '/inventory',      label: 'Склад',                      defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
  { resource: '/finance',        label: 'Финансы',                    defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
  { resource: '/payroll',        label: 'Зарплаты',                   defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
  { resource: '/risk',           label: 'Риски',                      defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
  { resource: '/promo-codes',    label: 'Промокоды',                  defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
  { resource: '/executive',      label: 'Исполнительная панель',      defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
  { resource: '/chat',           label: 'Чат',                        defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER','RECEPTIONIST','COSMETOLOGIST','MASSAGIST'] },
  { resource: '/staff-requests', label: 'Запросы сотрудников',        defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
  { resource: '/communications', label: 'Коммуникации',               defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
  { resource: '/settings',       label: 'Настройки',                  defaultRoles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
];

// ─── RoleSelect ───────────────────────────────────────────────────────────────

function RoleSelect({ currentRole, userId, onChanged, disabled }: {
  currentRole: UserRole; userId: string;
  onChanged: (id: string, r: UserRole) => void; disabled: boolean;
}) {
  const [open, setOpen]       = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const meta = ROLE_META[currentRole] ?? ROLE_META['CLIENT'];

  React.useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selectRole = async (newRole: UserRole) => {
    if (newRole === currentRole) { setOpen(false); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole }),
      });
      const json = await res.json() as { success: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) setError(json.error?.message ?? 'Ошибка');
      else onChanged(userId, newRole);
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); setOpen(false); }
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled || loading}
        className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all hover:opacity-80', meta.bg, meta.color, disabled && 'opacity-50 cursor-not-allowed')}
      >
        {loading && <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
        {meta.label}
        {!disabled && <ChevronDown className="w-3 h-3" />}
      </button>
      {error && <p className="text-red-400 text-xs mt-1 whitespace-nowrap">{error}</p>}
      {open && !disabled && (
        <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-onyx border border-border-luxury rounded-xl shadow-xl overflow-hidden">
          {ROLES.map((role) => (
            <button key={role} onClick={() => void selectRole(role)}
              className={cn('w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-charcoal', role === currentRole ? 'bg-charcoal/60' : '', ROLE_META[role].color)}>
              <span>{ROLE_META[role].label}</span>
              {role === currentRole && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── UserAccessModal ──────────────────────────────────────────────────────────

function UserAccessModal({
  user,
  onClose,
}: {
  user: StaffUser;
  onClose: () => void;
}) {
  const [grants, setGrants]     = React.useState<GrantRecord[]>([]);
  const [loading, setLoading]   = React.useState(true);
  const [saving, setSaving]     = React.useState<string | null>(null); // resource being saved
  const [error, setError]       = React.useState('');

  const fetchGrants = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/v1/admin/users/${user.id}/permissions`);
      const json = await res.json() as { success: boolean; data?: { grants: GrantRecord[] }; error?: { message?: string } };
      if (!json.success) { setError(json.error?.message ?? 'Ошибка загрузки'); }
      else { setGrants(json.data?.grants ?? []); }
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); }
  }, [user.id]);

  React.useEffect(() => { void fetchGrants(); }, [fetchGrants]);

  const grantedSet = React.useMemo(() => new Set(grants.map((g) => g.resource)), [grants]);

  const toggle = async (resource: string, currentlyGranted: boolean) => {
    setSaving(resource); setError('');
    try {
      if (currentlyGranted) {
        // Revoke
        const res = await fetch(`/api/v1/admin/users/${user.id}/permissions`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource }),
        });
        const json = await res.json() as { success: boolean; error?: { message?: string } };
        if (!json.success) { setError(json.error?.message ?? 'Ошибка'); return; }
        setGrants((prev) => prev.filter((g) => g.resource !== resource));
      } else {
        // Grant
        const res = await fetch(`/api/v1/admin/users/${user.id}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource }),
        });
        const json = await res.json() as { success: boolean; data?: { grant: GrantRecord }; error?: { message?: string } };
        if (!json.success) { setError(json.error?.message ?? 'Ошибка'); return; }
        if (json.data?.grant) {
          setGrants((prev) => [
            ...prev.filter((g) => g.resource !== resource),
            json.data!.grant,
          ]);
        }
      }
    } catch { setError('Ошибка сети'); }
    finally { setSaving(null); }
  };

  const meta = ROLE_META[user.role] ?? ROLE_META['CLIENT'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-onyx border border-border-luxury rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg luxury-gradient flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-obsidian">{user.firstName[0]}{user.lastName[0]}</span>
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-text-primary leading-tight">
                {user.firstName} {user.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-xs font-medium', meta.color)}>{meta.label}</span>
                <span className="text-text-tertiary text-xs">·</span>
                <span className="text-text-tertiary text-xs">{user.email}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-6 mt-4 flex items-start gap-3 p-3 rounded-xl bg-champagne/8 border border-champagne/20 shrink-0">
          <Info className="w-4 h-4 text-champagne shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Расширенный доступ даёт сотруднику возможность открывать страницы <strong className="text-text-primary">помимо</strong> тех, что разрешены его ролью.
            Изменения вступят в силу при <strong className="text-text-primary">следующем входе</strong> пользователя в систему.
          </p>
        </div>

        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Body — resource list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-charcoal rounded-xl animate-pulse" />
            ))
          ) : (
            GRANTABLE_RESOURCES.map(({ resource, label, defaultRoles }) => {
              const byRole    = defaultRoles.includes(user.role);
              const granted   = grantedSet.has(resource);
              const isSaving  = saving === resource;
              const grantInfo = grants.find((g) => g.resource === resource);

              return (
                <div
                  key={resource}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                    byRole
                      ? 'bg-charcoal/30 border-border-luxury opacity-60 cursor-not-allowed'
                      : granted
                      ? 'bg-green-500/8 border-green-500/30'
                      : 'bg-charcoal/20 border-border-luxury hover:bg-charcoal/40',
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                    byRole ? 'bg-text-tertiary/10' : granted ? 'bg-green-500/15' : 'bg-charcoal',
                  )}>
                    {byRole ? (
                      <Lock className="w-3.5 h-3.5 text-text-tertiary" />
                    ) : granted ? (
                      <Unlock className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-text-tertiary" />
                    )}
                  </div>

                  {/* Label + meta */}
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', byRole ? 'text-text-tertiary' : 'text-text-primary')}>
                      {label}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      {byRole
                        ? `Включено по роли «${meta.label}»`
                        : granted
                        ? `Расширенный доступ · предоставил ${grantInfo?.grantedBy.firstName} ${grantInfo?.grantedBy.lastName}`
                        : 'Нет доступа по роли'}
                    </p>
                  </div>

                  {/* Toggle */}
                  {!byRole && (
                    <button
                      onClick={() => void toggle(resource, granted)}
                      disabled={isSaving}
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-50',
                        granted ? 'bg-green-500' : 'bg-charcoal border border-border-luxury',
                      )}
                      aria-label={granted ? 'Отозвать доступ' : 'Выдать доступ'}
                    >
                      {isSaving ? (
                        <Loader2 className="w-3 h-3 text-white animate-spin mx-auto" />
                      ) : (
                        <span className={cn(
                          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                          granted ? 'translate-x-4' : 'translate-x-1',
                        )} />
                      )}
                    </button>
                  )}

                  {byRole && (
                    <div className={cn('px-2 py-0.5 rounded-md text-[10px] font-medium border shrink-0', meta.bg, meta.color)}>
                      По умолчанию
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-luxury shrink-0">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <KeyRound className="w-3.5 h-3.5" />
            <span>
              {grants.length === 0
                ? 'Расширенный доступ не назначен'
                : `${grants.length} расширенных разрешений`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal text-sm transition-all"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CreateUserModal ──────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = React.useState({
    firstName: '', lastName: '', email: '', phone: '',
    role: 'RECEPTIONIST' as UserRole, department: 'COSMETOLOGY', password: '',
  });
  const [showPw, setShowPw]   = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState('');

  const needsDept = form.role === 'COSMETOLOGIST' || form.role === 'MASSAGIST';

  const submit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password) {
      setError('Заполните все обязательные поля'); return;
    }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/v1/admin/staff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          department: needsDept ? form.department : undefined,
        }),
      });
      const json = await res.json() as { success: boolean; error?: { message?: string } };
      if (!json.success) { setError(json.error?.message ?? 'Ошибка создания'); }
      else { onCreated(); onClose(); }
    } catch { setError('Сетевая ошибка'); }
    finally { setLoading(false); }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-onyx border border-border-luxury rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">Создать сотрудника</h3>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Имя *" value={form.firstName} onChange={f('firstName')} placeholder="Иван" />
            <Field label="Фамилия *" value={form.lastName} onChange={f('lastName')} placeholder="Иванов" />
          </div>
          <Field label="Email *" value={form.email} onChange={f('email')} placeholder="ivan@shante-lyur.ru" type="email" />
          <Field label="Телефон" value={form.phone} onChange={f('phone')} placeholder="+7 999 000 00 00" type="tel" />

          <div>
            <label className="block text-xs text-text-tertiary mb-1.5">Роль *</label>
            <select value={form.role} onChange={f('role')}
              className="w-full bg-charcoal border border-border-luxury rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-champagne/30">
              {ROLES.filter((r) => r !== 'SUPER_ADMIN').map((r) => (
                <option key={r} value={r}>{ROLE_META[r].label}</option>
              ))}
            </select>
          </div>

          {needsDept && (
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">Направление *</label>
              <select value={form.department} onChange={f('department')}
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-champagne/30">
                <option value="COSMETOLOGY">Косметология</option>
                <option value="MASSAGE">Массаж</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-text-tertiary mb-1.5">Пароль * (мин. 6 символов)</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={f('password')}
                placeholder="Временный пароль"
                className="w-full bg-charcoal border border-border-luxury rounded-xl px-4 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-champagne/30"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border-luxury">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal text-sm transition-all">
            Отмена
          </button>
          <button onClick={() => void submit()} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-champagne text-obsidian font-semibold text-sm hover:bg-champagne/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Создать
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-text-tertiary mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-charcoal border border-border-luxury rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-champagne/30" />
    </div>
  );
}

// ─── AuditLogTab ──────────────────────────────────────────────────────────────

function AuditLogTab() {
  const [logs,     setLogs]     = React.useState<AuditEntry[]>([]);
  const [total,    setTotal]    = React.useState(0);
  const [page,     setPage]     = React.useState(1);
  const [pages,    setPages]    = React.useState(1);
  const [loading,  setLoading]  = React.useState(true);
  const [action,   setAction]   = React.useState('');
  const [entity,   setEntity]   = React.useState('');

  const load = React.useCallback(async (p: number) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p), limit: '50' });
    if (action) q.set('action', action);
    if (entity) q.set('entityType', entity);
    try {
      const res  = await fetch(`/api/v1/admin/audit-logs?${q}`);
      const json = await res.json() as { success: boolean; data?: { items: AuditEntry[]; total: number; pages: number } };
      if (json.success && json.data) {
        setLogs(json.data.items); setTotal(json.data.total); setPages(json.data.pages);
      }
    } finally { setLoading(false); }
  }, [action, entity]);

  React.useEffect(() => { setPage(1); void load(1); }, [load]);

  const goPage = (p: number) => { setPage(p); void load(p); };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={action} onChange={(e) => setAction(e.target.value)}
          className="bg-charcoal border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-champagne/30">
          <option value="">Все действия</option>
          {Object.entries(AUDIT_ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input value={entity} onChange={(e) => setEntity(e.target.value)}
          placeholder="Тип сущности (User, Appointment…)"
          className="bg-charcoal border border-border-luxury rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-champagne/30 w-60" />
        <div className="ml-auto text-xs text-text-tertiary self-center">
          {loading ? 'Загрузка…' : `${total} записей`}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury bg-charcoal/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider whitespace-nowrap">Время</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Пользователь</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Действие</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Сущность</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider whitespace-nowrap">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3 bg-charcoal rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-text-tertiary">Записей не найдено</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-charcoal/30 transition-colors">
                  <td className="px-4 py-3 text-text-tertiary text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('ru-RU', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    {log.user
                      ? <div><p className="text-text-primary text-xs font-medium">{log.user.name}</p><p className="text-text-tertiary text-xs">{log.user.email}</p></div>
                      : <span className="text-text-tertiary text-xs">Система</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex px-2 py-0.5 rounded-md text-xs font-medium border',
                      log.action === 'CREATE' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                      log.action === 'DELETE' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                      log.action.includes('LOGIN') ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                      'bg-charcoal border-border-luxury text-text-secondary'
                    )}>
                      {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">
                    {log.entityType}
                    {log.entityId && <span className="text-text-tertiary ml-1">#{log.entityId.slice(0,8)}</span>}
                  </td>
                  <td className="px-4 py-3 text-text-tertiary text-xs font-mono">{log.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-luxury">
            <span className="text-xs text-text-tertiary">Страница {page} из {pages}</span>
            <div className="flex gap-1">
              <button onClick={() => goPage(page - 1)} disabled={page <= 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal disabled:opacity-40 transition-all">
                ←
              </button>
              <button onClick={() => goPage(page + 1)} disabled={page >= pages}
                className="px-3 py-1.5 text-xs rounded-lg border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal disabled:opacity-40 transition-all">
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  useLanguage();
  const [tab,      setTab]      = React.useState<PageTab>('users');
  const [users,    setUsers]    = React.useState<StaffUser[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const [error,    setError]    = React.useState('');
  const [search,   setSearch]   = React.useState('');
  const [filterRole, setFilterRole] = React.useState<UserRole | ''>('');
  const [myRole,   setMyRole]   = React.useState<string>('');
  const [myUserId, setMyUserId] = React.useState<string>('');
  const [showCreate, setShowCreate] = React.useState(false);
  const [accessUser, setAccessUser] = React.useState<StaffUser | null>(null);

  const isSuperAdmin = myRole === 'SUPER_ADMIN';
  const isAdmin      = myRole === 'ADMIN' || isSuperAdmin;

  React.useEffect(() => {
    setMyRole(getClientRole());
    setMyUserId(getClientUserId());
  }, []);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/admin/users?limit=500&all=true');
      const json = await res.json() as { success: boolean; data?: { items?: ApiUser[] }; error?: { message?: string } };
      if (!json.success) { setError(json.error?.message ?? 'Ошибка загрузки'); }
      else {
        setUsers((json.data?.items ?? [])
          .filter((u) => (ROLES as string[]).includes(u.role))
          .map((u) => ({ ...u, role: u.role as UserRole })));
      }
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const handleRoleChanged = React.useCallback((id: string, newRole: UserRole) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: newRole } : u));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (!q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q))
      && (!filterRole || u.role === filterRole);
  });

  const roleCounts = React.useMemo(() => {
    const c: Record<string, number> = {};
    users.forEach((u) => { c[u.role] = (c[u.role] ?? 0) + 1; });
    return c;
  }, [users]);

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { void fetchUsers(); }}
        />
      )}

      {accessUser && (
        <UserAccessModal
          user={accessUser}
          onClose={() => setAccessUser(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-champagne" />
            Управление персоналом
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Роли, права доступа и создание сотрудников
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-champagne text-obsidian font-semibold text-sm hover:bg-champagne/90 transition-all"
            >
              <UserPlus className="w-4 h-4" /> Добавить сотрудника
            </button>
          )}
          <button
            onClick={() => void fetchUsers()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-all text-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-charcoal/50 rounded-xl w-fit">
        {([['users','Сотрудники',User],['audit','Журнал аудита',ClipboardList]] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t as PageTab)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'bg-onyx text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary')}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Users Tab ──────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <>
          {/* Role summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {ROLES.map((role) => {
              const meta = ROLE_META[role]; const count = roleCounts[role] ?? 0;
              return (
                <button key={role} onClick={() => setFilterRole((p) => p === role ? '' : role)}
                  className={cn('flex flex-col items-center p-3 rounded-xl border text-center transition-all hover:opacity-90',
                    filterRole === role ? meta.bg : 'bg-charcoal/50 border-border-luxury')}>
                  <span className={cn('text-2xl font-bold font-serif', meta.color)}>{count}</span>
                  <span className={cn('text-[10px] mt-0.5', filterRole === role ? meta.color : 'text-text-tertiary')}>{meta.label}</span>
                </button>
              );
            })}
          </div>

          {/* Permissions matrix */}
          <div className="rounded-2xl border border-border-luxury bg-charcoal/30 p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">Матрица доступа</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {ROLES.filter((r) => r !== 'CLIENT').map((role) => {
                const meta = ROLE_META[role];
                return (
                  <div key={role} className={cn('rounded-xl border p-3', meta.bg)}>
                    <p className={cn('text-xs font-semibold mb-2', meta.color)}>{meta.label}</p>
                    <ul className="space-y-1">
                      {ROLE_PERMISSIONS[role].map((perm) => (
                        <li key={perm} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                          <Check className={cn('w-3 h-3 shrink-0', meta.color)} /> {perm}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input type="text" placeholder="Поиск по имени или email..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-charcoal border border-border-luxury rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-champagne/30" />
            </div>
            {filterRole && (
              <button onClick={() => setFilterRole('')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal text-sm transition-all">
                <X className="w-4 h-4" /> Сбросить
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" /><p className="text-sm">{error}</p>
            </div>
          )}

          {/* Users table */}
          <div className="rounded-2xl border border-border-luxury overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-luxury bg-charcoal/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Пользователь</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Эл. почта</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Роль</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Статус</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider whitespace-nowrap">Последний вход</th>
                    {isSuperAdmin && (
                      <th className="text-left px-4 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider whitespace-nowrap">Доступ</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-luxury">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: isSuperAdmin ? 6 : 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-charcoal rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-12 text-center text-text-tertiary">
                      <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Пользователи не найдены</p>
                    </td></tr>
                  ) : filtered.map((user) => {
                    const isSelf  = user.id === myUserId;
                    const canEdit = isSuperAdmin && user.role !== 'SUPER_ADMIN' && !isSelf;
                    return (
                      <tr key={user.id} className="hover:bg-charcoal/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg luxury-gradient flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-obsidian">{user.firstName[0]}{user.lastName[0] ?? ''}</span>
                            </div>
                            <span className="font-medium text-text-primary">{user.firstName} {user.lastName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                        <td className="px-4 py-3">
                          <RoleSelect currentRole={user.role} userId={user.id} onChanged={handleRoleChanged} disabled={!canEdit} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                            user.status === 'ACTIVE' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400')}>
                            {user.status === 'ACTIVE' ? 'Активен' : user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-tertiary text-xs">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'}
                        </td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3">
                            {canEdit ? (
                              <button
                                onClick={() => setAccessUser(user)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-champagne/30 text-champagne text-xs font-medium hover:bg-champagne/10 transition-all"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                Доступ
                              </button>
                            ) : (
                              <span className="text-text-tertiary text-xs">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!loading && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-border-luxury text-xs text-text-tertiary">
                Показано {filtered.length} из {users.length} сотрудников
              </div>
            )}
          </div>

          {!isSuperAdmin && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Только просмотр</p>
                <p className="text-xs mt-1 opacity-80">Изменение ролей доступно только Супер-администратору.</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Audit Tab ──────────────────────────────────────────────────────── */}
      {tab === 'audit' && <AuditLogTab />}
    </div>
  );
}
