'use client';

import * as React from 'react';
import {
  ShieldCheck, Search, RefreshCw, ChevronDown,
  User, AlertTriangle, Check, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'COSMETOLOGIST' | 'MASSAGIST' | 'CLIENT';

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'COSMETOLOGIST', 'MASSAGIST'];

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
  ADMIN:         ['Бронирования', 'Клиенты', 'Специалисты', 'Аналитика', 'Финансы', 'Настройки'],
  MANAGER:       ['Бронирования', 'Клиенты', 'Аналитика', 'Продажи', 'Склад', 'Промокоды'],
  RECEPTIONIST:  ['Бронирования', 'Клиенты', 'Стойка администратора'],
  COSMETOLOGIST: ['Свои записи', 'Расписание', 'Процедуры клиентов'],
  MASSAGIST:     ['Свои записи', 'Расписание', 'Процедуры клиентов'],
  CLIENT:        ['Свои бронирования', 'Личные данные'],
};

// ─── Components ───────────────────────────────────────────────────────────────

function RoleSelect({
  currentRole,
  userId,
  onChanged,
  disabled,
}: {
  currentRole: UserRole;
  userId: string;
  onChanged: (userId: string, newRole: UserRole) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);
  const meta = ROLE_META[currentRole] ?? ROLE_META['CLIENT'];

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectRole = async (newRole: UserRole) => {
    if (newRole === currentRole) { setOpen(false); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole }),
      });
      const json = await res.json() as { success: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Ошибка');
      } else {
        onChanged(userId, newRole);
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled || loading}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all',
          meta.bg,
          meta.color,
          'hover:opacity-80',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {loading ? (
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {meta.label}
        {!disabled && <ChevronDown className="w-3 h-3" />}
      </button>
      {error && <p className="text-red-400 text-xs mt-1 whitespace-nowrap">{error}</p>}
      {open && !disabled && (
        <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-onyx border border-border-luxury rounded-xl shadow-xl overflow-hidden">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => void selectRole(role)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-charcoal',
                role === currentRole ? 'bg-charcoal/60' : '',
                ROLE_META[role].color,
              )}
            >
              <span>{ROLE_META[role].label}</span>
              {role === currentRole && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  useLanguage();
  const [users, setUsers] = React.useState<StaffUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [filterRole, setFilterRole] = React.useState<UserRole | ''>('');
  const [myRole, setMyRole] = React.useState<string>('');

  const isSuperAdmin = myRole === 'SUPER_ADMIN';

  // Resolve current user's role from JWT
  React.useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
      if (match) {
        const payload = JSON.parse(atob(match[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        setMyRole((payload.role as string) ?? '');
      }
    } catch {}
  }, []);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users?limit=500&all=true');
      const json = await res.json() as { success: boolean; data?: { items?: ApiUser[] }; error?: { message?: string } };
      if (!json.success) {
        setError(json.error?.message ?? 'Ошибка загрузки');
      } else {
        setUsers(
          (json.data?.items ?? [])
            .filter((u) => (ROLES as string[]).includes(u.role))
            .map((u) => ({ ...u, role: u.role as UserRole })),
        );
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const handleRoleChanged = React.useCallback((userId: string, newRole: UserRole) => {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ = !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
    const matchR = !filterRole || u.role === filterRole;
    return matchQ && matchR;
  });

  const roleCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => { counts[u.role] = (counts[u.role] ?? 0) + 1; });
    return counts;
  }, [users]);

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-champagne" />
            Управление правами доступа
          </h2>
          <p className="text-text-secondary mt-1 text-sm">
            Назначение ролей и разрешений для сотрудников системы
          </p>
        </div>
        <button
          onClick={() => void fetchUsers()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-all text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {ROLES.map((role) => {
          const meta = ROLE_META[role];
          const count = roleCounts[role] ?? 0;
          return (
            <button
              key={role}
              onClick={() => setFilterRole((prev) => prev === role ? '' : role)}
              className={cn(
                'flex flex-col items-center p-3 rounded-xl border text-center transition-all',
                filterRole === role ? meta.bg : 'bg-charcoal/50 border-border-luxury',
                'hover:opacity-90',
              )}
            >
              <span className={cn('text-2xl font-bold font-serif', meta.color)}>{count}</span>
              <span className={cn('text-[10px] mt-0.5', filterRole === role ? meta.color : 'text-text-tertiary')}>
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Permissions reference */}
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
                      <Check className={cn('w-3 h-3 shrink-0', meta.color)} />
                      {perm}
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
          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-charcoal border border-border-luxury rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-champagne/30"
          />
        </div>
        {filterRole && (
          <button
            onClick={() => setFilterRole('')}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal text-sm transition-all"
          >
            <X className="w-4 h-4" />
            Сбросить фильтр
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Users table */}
      <div className="rounded-2xl border border-border-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury bg-charcoal/50">
                <th className="text-left px-4 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wider">Пользователь</th>
                <th className="text-left px-4 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wider">Роль</th>
                <th className="text-left px-4 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wider">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-text-tertiary text-xs uppercase tracking-wider">Последний вход</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-charcoal rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-text-tertiary">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Пользователи не найдены</p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const canEdit = isSuperAdmin && user.role !== 'SUPER_ADMIN';
                  return (
                    <tr key={user.id} className="hover:bg-charcoal/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg luxury-gradient flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-obsidian">
                              {user.firstName[0]}{user.lastName[0] ?? ''}
                            </span>
                          </div>
                          <span className="font-medium text-text-primary">{user.firstName} {user.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                      <td className="px-4 py-3">
                        <RoleSelect
                          currentRole={user.role}
                          userId={user.id}
                          onChanged={handleRoleChanged}
                          disabled={!canEdit}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                          user.status === 'ACTIVE'
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400',
                        )}>
                          {user.status === 'ACTIVE' ? 'Активен' : user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-tertiary text-xs">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border-luxury text-xs text-text-tertiary">
            Показано {filtered.length} из {users.length} пользователей
          </div>
        )}
      </div>

      {/* Security note */}
      {!isSuperAdmin && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Только просмотр</p>
            <p className="text-xs mt-1 opacity-80">
              Изменение ролей доступно только Супер-администратору. Обратитесь к системному администратору для изменения прав.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
