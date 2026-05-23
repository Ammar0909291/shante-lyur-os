'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Crown, Edit2, Save, X, Phone, Mail, Calendar,
  User, MapPin, Star, Clock, CreditCard, Scissors, FileText,
  TrendingUp, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { cn, formatCurrency, formatDate, formatDateTime, getInitials } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge, getAppointmentStatusBadgeVariant, getAppointmentStatusLabel, getPaymentStatusBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type LoyaltyTier, getTierLabel, getTierBadgeVariant, normalizeTier } from '@/app/(dashboard)/clients/_client-types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileClient {
  id: string;
  displayId: string;
  name: string;
  email: string;
  phone?: string;
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt?: string;
  firstVisitAt?: string;
  churnRiskScore?: number;
  notes?: string;
  gender?: string;
  dateOfBirth?: string;
  referralSource?: string;
  createdAt: string;
  tags?: string[];
}

interface Appointment {
  id: string;
  scheduledAt: string;
  status: string;
  serviceName: string;
  specialistName: string;
  durationMinutes: number;
  price: number;
}

interface Payment {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
  method: string;
  description: string;
}

interface Procedure {
  id: string;
  name: string;
  count: number;
  lastUsedAt: string;
  totalSpent: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayId(id: string): string {
  const hex = id.replace(/-/g, '').slice(-8);
  const num = parseInt(hex, 16) % 9000 + 1000;
  return String(num).slice(0, 4);
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PROFILES: Record<string, ProfileClient> = {
  'a1b2c3d4-0001': {
    id: 'a1b2c3d4-0001', displayId: '0001', name: 'Анна Соколова', email: 'anna.sokolova@mail.ru',
    phone: '+7 916 100-00-01', loyaltyTier: 'DIAMOND', loyaltyPoints: 4800, totalVisits: 54,
    totalSpent: 72400000, lastVisitAt: '2026-05-22', firstVisitAt: '2023-01-15',
    createdAt: '2023-01-15', gender: 'female', dateOfBirth: '1988-03-12',
    referralSource: 'social', notes: 'Предпочитает мастера Елену. Аллергия на некоторые краски — уточнять перед записью.',
    tags: ['VIP', 'Постоянная'],
  },
  'a1b2c3d4-0002': {
    id: 'a1b2c3d4-0002', displayId: '0002', name: 'Елена Морозова', email: 'e.morozova@gmail.com',
    phone: '+7 903 200-00-02', loyaltyTier: 'DIAMOND', loyaltyPoints: 3200, totalVisits: 48,
    totalSpent: 62000000, lastVisitAt: '2026-05-20', firstVisitAt: '2023-03-10',
    createdAt: '2023-03-10', gender: 'female', referralSource: 'friend', notes: 'Клиент по рекомендации.',
    tags: ['VIP'],
  },
  'a1b2c3d4-0003': {
    id: 'a1b2c3d4-0003', displayId: '0003', name: 'Наталья Попова', email: 'n.popova@yandex.ru',
    phone: '+7 925 300-00-03', loyaltyTier: 'GOLD', loyaltyPoints: 1850, totalVisits: 28,
    totalSpent: 38500000, lastVisitAt: '2026-05-18', firstVisitAt: '2024-01-20',
    createdAt: '2024-01-20', gender: 'female',
  },
};

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'apt-1', scheduledAt: '2026-05-22T14:00:00Z', status: 'COMPLETED', serviceName: 'Окрашивание', specialistName: 'Елена К.', durationMinutes: 120, price: 650000 },
  { id: 'apt-2', scheduledAt: '2026-04-18T11:30:00Z', status: 'COMPLETED', serviceName: 'Стрижка и укладка', specialistName: 'Мария В.', durationMinutes: 60, price: 320000 },
  { id: 'apt-3', scheduledAt: '2026-03-05T10:00:00Z', status: 'COMPLETED', serviceName: 'Уход за волосами', specialistName: 'Елена К.', durationMinutes: 90, price: 480000 },
  { id: 'apt-4', scheduledAt: '2026-02-14T15:00:00Z', status: 'NO_SHOW', serviceName: 'Маникюр', specialistName: 'Анна Р.', durationMinutes: 75, price: 280000 },
  { id: 'apt-5', scheduledAt: '2026-01-20T12:00:00Z', status: 'COMPLETED', serviceName: 'Окрашивание', specialistName: 'Елена К.', durationMinutes: 120, price: 650000 },
];

const MOCK_PAYMENTS: Payment[] = [
  { id: 'pay-1', createdAt: '2026-05-22T15:30:00Z', amount: 650000, status: 'PAID', method: 'card', description: 'Окрашивание' },
  { id: 'pay-2', createdAt: '2026-04-18T12:45:00Z', amount: 320000, status: 'PAID', method: 'card', description: 'Стрижка и укладка' },
  { id: 'pay-3', createdAt: '2026-03-05T11:30:00Z', amount: 480000, status: 'PAID', method: 'cash', description: 'Уход за волосами' },
  { id: 'pay-4', createdAt: '2026-01-20T13:15:00Z', amount: 650000, status: 'PAID', method: 'card', description: 'Окрашивание' },
];

const MOCK_PROCEDURES: Procedure[] = [
  { id: 'proc-1', name: 'Окрашивание', count: 12, lastUsedAt: '2026-05-22', totalSpent: 7800000 },
  { id: 'proc-2', name: 'Стрижка и укладка', count: 18, lastUsedAt: '2026-04-18', totalSpent: 5760000 },
  { id: 'proc-3', name: 'Уход за волосами', count: 8, lastUsedAt: '2026-03-05', totalSpent: 3840000 },
  { id: 'proc-4', name: 'Маникюр', count: 4, lastUsedAt: '2026-01-20', totalSpent: 1120000 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const TIERS: LoyaltyTier[] = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];

function LoyaltyBadge({ tier }: { tier: LoyaltyTier }) {
  return (
    <Badge variant={getTierBadgeVariant(tier)} dot>
      {tier === 'DIAMOND' && <Crown className="w-2.5 h-2.5 mr-0.5" />}
      {getTierLabel(tier)}
    </Badge>
  );
}

function ChurnRiskBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score > 0.65 ? 'bg-red-400' : score > 0.4 ? 'bg-amber-400' : 'bg-sage';
  const label = score > 0.65 ? 'Высокий' : score > 0.4 ? 'Средний' : 'Низкий';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-tertiary">Риск оттока</span>
        <span className={cn('font-semibold', score > 0.65 ? 'text-red-400' : score > 0.4 ? 'text-amber-400' : 'text-sage')}>
          {label} {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-charcoal rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-luxury last:border-0">
      <div className="w-5 h-5 mt-0.5 shrink-0 text-text-tertiary">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-tertiary mb-0.5">{label}</p>
        <div className="text-sm text-text-primary">{value}</div>
      </div>
    </div>
  );
}

function StatPill({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-charcoal rounded-xl p-4 border border-border-luxury">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">{label}</p>
      <p className="font-serif text-2xl font-medium text-text-primary mt-1 leading-none">{value}</p>
      {sub && <p className="text-xs text-text-tertiary mt-1">{sub}</p>}
    </div>
  );
}

type TabKey = 'overview' | 'visits' | 'payments' | 'procedures' | 'notes';

const TAB_LABELS: Record<TabKey, string> = {
  overview: 'Обзор',
  visits: 'Визиты',
  payments: 'Платежи',
  procedures: 'Процедуры',
  notes: 'Заметки',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = React.useState<ProfileClient | null>(null);
  const [appointments, setAppointments] = React.useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [payments, setPayments] = React.useState<Payment[]>(MOCK_PAYMENTS);
  const [procedures, setProcedures] = React.useState<Procedure[]>(MOCK_PROCEDURES);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<TabKey>('overview');

  const [editingTier, setEditingTier] = React.useState(false);
  const [tierDraft, setTierDraft] = React.useState<LoyaltyTier>('BRONZE');
  const [savingTier, setSavingTier] = React.useState(false);

  const [editingNotes, setEditingNotes] = React.useState(false);
  const [notesDraft, setNotesDraft] = React.useState('');
  const [savingNotes, setSavingNotes] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const res = await fetch(`/api/customers/${id}`, {
          headers: { 'x-user-id': 'mock', 'x-user-role': 'ADMIN' },
        });
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        if (cancelled) return;

        const raw = json?.data ?? json;
        const profile = raw?.profile ?? raw;
        const user = raw?.user ?? {};
        const rawId = profile?.id ?? id;
        const hex = rawId.replace(/-/g, '').slice(-8);
        const num = parseInt(hex, 16) % 9000 + 1000;

        const normalized: ProfileClient = {
          id: rawId,
          displayId: String(num).slice(0, 4),
          name: user.name ?? profile.name ?? 'Клиент',
          email: user.email ?? profile.email ?? '',
          phone: user.phone ?? profile.phone,
          loyaltyTier: normalizeTier(profile.loyaltyTier ?? 'BRONZE'),
          loyaltyPoints: profile.loyaltyPoints ?? 0,
          totalVisits: profile.totalVisits ?? 0,
          totalSpent: Number(profile.totalSpent ?? 0) * 100,
          lastVisitAt: profile.lastVisitAt,
          firstVisitAt: profile.firstVisitAt,
          churnRiskScore: profile.churnRiskScore != null ? Number(profile.churnRiskScore) : undefined,
          notes: profile.notes,
          gender: profile.gender,
          dateOfBirth: profile.dateOfBirth,
          referralSource: profile.referralSource,
          createdAt: profile.createdAt ?? new Date().toISOString(),
        };

        const apts = (raw?.recentAppointments ?? []).map((a: Record<string, unknown>) => ({
          id: a.id as string,
          scheduledAt: a.scheduledAt as string,
          status: a.status as string,
          serviceName: (a.service as Record<string, unknown>)?.name as string ?? 'Услуга',
          specialistName: ((a.specialist as Record<string, unknown>)?.user as Record<string, unknown>)?.name as string ?? 'Мастер',
          durationMinutes: (a.service as Record<string, unknown>)?.durationMinutes as number ?? 60,
          price: Number((a.service as Record<string, unknown>)?.price ?? 0) * 100,
        }));

        setClient(normalized);
        if (apts.length > 0) setAppointments(apts);
      } catch {
        if (!cancelled) {
          const mock = MOCK_PROFILES[id] ?? {
            id, displayId: getDisplayId(id), name: 'Клиент', email: '',
            loyaltyTier: 'BRONZE' as LoyaltyTier, loyaltyPoints: 0, totalVisits: 0,
            totalSpent: 0, createdAt: new Date().toISOString(),
          };
          setClient(mock);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  React.useEffect(() => {
    if (client) {
      setTierDraft(client.loyaltyTier);
      setNotesDraft(client.notes ?? '');
    }
  }, [client]);

  async function saveTier() {
    if (!client) return;
    setSavingTier(true);
    try {
      await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loyaltyTier: tierDraft === 'DIAMOND' ? 'PLATINUM' : tierDraft }),
      });
    } catch { /* optimistic */ }
    setClient(prev => prev ? { ...prev, loyaltyTier: tierDraft } : prev);
    setEditingTier(false);
    setSavingTier(false);
  }

  async function saveNotes() {
    if (!client) return;
    setSavingNotes(true);
    try {
      await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesDraft }),
      });
    } catch { /* optimistic */ }
    setClient(prev => prev ? { ...prev, notes: notesDraft } : prev);
    setEditingNotes(false);
    setSavingNotes(false);
  }

  const inputCls = cn(
    'w-full px-3 py-2.5 rounded-xl text-sm',
    'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
    'focus:outline-none focus:border-champagne/50 transition-all',
  );

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="h-8 w-32 bg-charcoal rounded-lg animate-shimmer" />
        <div className="bg-onyx border border-border-luxury rounded-2xl p-6 flex gap-5">
          <div className="w-20 h-20 rounded-full bg-charcoal animate-shimmer shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 bg-charcoal rounded animate-shimmer" />
            <div className="h-4 w-32 bg-charcoal rounded animate-shimmer" />
            <div className="h-4 w-24 bg-charcoal rounded animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="w-10 h-10 text-text-tertiary mb-3" />
        <h2 className="font-serif text-xl text-text-primary mb-1">Клиент не найден</h2>
        <p className="text-sm text-text-tertiary mb-4">Профиль с указанным ID не существует.</p>
        <Button variant="secondary" size="sm" onClick={() => router.push('/clients')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> К списку клиентов
        </Button>
      </div>
    );
  }

  const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">

      {/* ── Back ────────────────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/clients')}
        className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-secondary transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Все клиенты
      </button>

      {/* ── Profile header ──────────────────────────────────────────── */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <Avatar name={client.name} size="xl" className="shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h1 className="font-serif text-2xl font-medium text-text-primary leading-none">{client.name}</h1>
              <span className="text-xs font-mono text-text-tertiary bg-charcoal px-2 py-1 rounded-lg border border-border-luxury">
                #{client.displayId}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {editingTier ? (
                <div className="flex items-center gap-2">
                  <select
                    value={tierDraft}
                    onChange={e => setTierDraft(e.target.value as LoyaltyTier)}
                    className={cn(inputCls, 'py-1 w-auto text-xs')}
                  >
                    {TIERS.map(t => (
                      <option key={t} value={t}>{getTierLabel(t)}</option>
                    ))}
                  </select>
                  <Button variant="primary" size="sm" onClick={saveTier} isLoading={savingTier} disabled={savingTier}>
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditingTier(false); setTierDraft(client.loyaltyTier); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingTier(true)}
                  className="group flex items-center gap-1.5"
                  title="Изменить уровень лояльности"
                >
                  <LoyaltyBadge tier={client.loyaltyTier} />
                  <Edit2 className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              <span className="text-xs text-text-tertiary">{client.loyaltyPoints.toLocaleString('ru')} баллов</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatPill label="Визитов" value={client.totalVisits} sub={client.firstVisitAt ? `с ${formatDate(client.firstVisitAt)}` : undefined} />
              <StatPill label="Потрачено" value={formatCurrency(client.totalSpent / 100)} />
              <StatPill label="Последний визит" value={client.lastVisitAt ? formatDate(client.lastVisitAt) : '—'} />
            </div>
          </div>
        </div>

        {client.churnRiskScore != null && client.churnRiskScore > 0.3 && (
          <div className="mt-4 pt-4 border-t border-border-luxury">
            <ChurnRiskBar score={client.churnRiskScore} />
          </div>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 border-b border-border-luxury overflow-x-auto pb-0 scrollbar-none">
        {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px',
              activeTab === tab
                ? 'border-champagne text-champagne'
                : 'border-transparent text-text-tertiary hover:text-text-secondary',
            )}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────── */}

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Contact info */}
          <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-4">Контакты</h2>
            <InfoRow
              icon={<Phone className="w-4 h-4" />}
              label="Телефон"
              value={client.phone
                ? <a href={`tel:${client.phone}`} className="hover:text-champagne transition-colors">{client.phone}</a>
                : <span className="text-text-tertiary">—</span>}
            />
            <InfoRow
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              value={client.email
                ? <a href={`mailto:${client.email}`} className="hover:text-champagne transition-colors truncate block">{client.email}</a>
                : <span className="text-text-tertiary">—</span>}
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Дата рождения"
              value={client.dateOfBirth
                ? formatDate(client.dateOfBirth)
                : <span className="text-text-tertiary">—</span>}
            />
            <InfoRow
              icon={<User className="w-4 h-4" />}
              label="Пол"
              value={client.gender === 'female' ? 'Женский' : client.gender === 'male' ? 'Мужской' : <span className="text-text-tertiary">—</span>}
            />
            <InfoRow
              icon={<MapPin className="w-4 h-4" />}
              label="Источник"
              value={client.referralSource
                ? ({ social: 'Соцсети', friend: 'Рекомендация', search: 'Поиск', walk_in: 'Прямое обращение' }[client.referralSource] ?? client.referralSource)
                : <span className="text-text-tertiary">—</span>}
            />
            <InfoRow
              icon={<Star className="w-4 h-4" />}
              label="Клиент с"
              value={formatDate(client.createdAt)}
            />
          </div>

          {/* Quick stats */}
          <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-4">Статистика</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2.5 border-b border-border-luxury">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <TrendingUp className="w-4 h-4 text-text-tertiary" /> Средний чек
                </div>
                <span className="text-sm font-semibold text-text-primary">
                  {client.totalVisits > 0
                    ? formatCurrency(client.totalSpent / client.totalVisits / 100)
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-border-luxury">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <CreditCard className="w-4 h-4 text-text-tertiary" /> Оплачено
                </div>
                <span className="text-sm font-semibold text-sage">{formatCurrency(totalPaid / 100)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-border-luxury">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Scissors className="w-4 h-4 text-text-tertiary" /> Процедур
                </div>
                <span className="text-sm font-semibold text-text-primary">{procedures.length}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle2 className="w-4 h-4 text-text-tertiary" /> Завершено визитов
                </div>
                <span className="text-sm font-semibold text-text-primary">
                  {appointments.filter(a => a.status === 'COMPLETED').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visits */}
      {activeTab === 'visits' && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border-luxury">
            <h2 className="text-sm font-semibold text-text-primary">История визитов</h2>
            <p className="text-xs text-text-tertiary mt-0.5">{appointments.length} записей</p>
          </div>
          {appointments.length === 0 ? (
            <div className="py-12 text-center text-text-tertiary text-sm">Визитов ещё нет</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-luxury">
                  {['Дата', 'Услуга', 'Мастер', 'Длительность', 'Сумма', 'Статус'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary first:pl-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map(apt => (
                  <tr key={apt.id} className="border-b border-border-luxury last:border-0 hover:bg-charcoal/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">
                      {formatDate(apt.scheduledAt)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-primary font-medium">{apt.serviceName}</td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{apt.specialistName}</td>
                    <td className="px-5 py-3.5 text-sm text-text-tertiary">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />{apt.durationMinutes} мин
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-primary">
                      {formatCurrency(apt.price / 100)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={getAppointmentStatusBadgeVariant(apt.status)} dot>
                        {getAppointmentStatusLabel(apt.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Payments */}
      {activeTab === 'payments' && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border-luxury flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">История платежей</h2>
              <p className="text-xs text-text-tertiary mt-0.5">{payments.length} транзакций</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-tertiary">Итого оплачено</p>
              <p className="text-base font-semibold text-sage">{formatCurrency(totalPaid / 100)}</p>
            </div>
          </div>
          {payments.length === 0 ? (
            <div className="py-12 text-center text-text-tertiary text-sm">Платежей нет</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-luxury">
                  {['Дата', 'Описание', 'Способ', 'Сумма', 'Статус'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(pay => (
                  <tr key={pay.id} className="border-b border-border-luxury last:border-0 hover:bg-charcoal/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-text-secondary whitespace-nowrap">
                      {formatDateTime(pay.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-primary">{pay.description}</td>
                    <td className="px-5 py-3.5 text-sm text-text-tertiary capitalize">
                      {pay.method === 'card' ? 'Карта' : pay.method === 'cash' ? 'Наличные' : pay.method}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-text-primary">
                      {formatCurrency(pay.amount / 100)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={getPaymentStatusBadgeVariant(pay.status)} dot>
                        {pay.status === 'PAID' ? 'Оплачено' : pay.status === 'REFUNDED' ? 'Возврат' : 'Не оплачено'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Procedures */}
      {activeTab === 'procedures' && (
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border-luxury">
            <h2 className="text-sm font-semibold text-text-primary">Приобретённые процедуры</h2>
            <p className="text-xs text-text-tertiary mt-0.5">{procedures.length} видов услуг</p>
          </div>
          {procedures.length === 0 ? (
            <div className="py-12 text-center text-text-tertiary text-sm">Процедур нет</div>
          ) : (
            <div className="divide-y divide-border-luxury">
              {procedures.map(proc => (
                <div key={proc.id} className="px-5 py-4 flex items-center justify-between hover:bg-charcoal/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-champagne/8 flex items-center justify-center shrink-0">
                      <Scissors className="w-4 h-4 text-champagne" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{proc.name}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        Последний: {formatDate(proc.lastUsedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text-primary">{proc.count}×</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{formatCurrency(proc.totalSpent / 100)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {activeTab === 'notes' && (
        <div className="bg-onyx border border-border-luxury rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-sm font-semibold text-text-primary">Заметки о клиенте</h2>
            </div>
            {!editingNotes ? (
              <Button variant="ghost" size="sm" onClick={() => { setNotesDraft(client.notes ?? ''); setEditingNotes(true); }}>
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Редактировать
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditingNotes(false)}>
                  Отмена
                </Button>
                <Button variant="primary" size="sm" onClick={saveNotes} isLoading={savingNotes} disabled={savingNotes}>
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Сохранить
                </Button>
              </div>
            )}
          </div>

          {editingNotes ? (
            <textarea
              className={cn(inputCls, 'h-40 resize-none')}
              placeholder="Добавьте заметки о клиенте..."
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
            />
          ) : (
            <div className={cn(
              'min-h-[120px] rounded-xl p-4 border border-border-luxury',
              'bg-charcoal text-sm text-text-secondary leading-relaxed',
              !client.notes && 'italic text-text-tertiary',
            )}>
              {client.notes || 'Заметки не добавлены. Нажмите «Редактировать», чтобы добавить.'}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
