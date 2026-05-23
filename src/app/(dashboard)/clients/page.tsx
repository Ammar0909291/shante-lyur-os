'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, UserCheck, UserPlus, UserMinus,
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Crown, SlidersHorizontal, X,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { useLocale } from '@/components/providers/locale-provider';
import {
  type LoyaltyTier, type Client,
  getTierRank, getTierLabel, getTierBadgeVariant, normalizeTier,
} from './_client-types';

// ─── Local types ──────────────────────────────────────────────────────────────

type SortField = 'name' | 'loyaltyTier' | 'totalVisits' | 'totalSpent' | 'lastVisitAt';
type SortDir = 'asc' | 'desc';
type Period = 'D' | 'W' | 'M' | 'Q' | 'Y' | 'custom';
type LoyaltyFilter = 'ALL' | LoyaltyTier;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayId(id: string): string {
  const hex = id.replace(/-/g, '').slice(-8);
  const num = parseInt(hex, 16) % 9000 + 1000;
  return String(num).slice(0, 4);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeClient(raw: any, index: number): Client {
  const profile = raw.profile ?? raw;
  const user = raw.user ?? {};
  const id = profile.id ?? String(index);
  const hex = id.replace(/-/g, '').slice(-8);
  const num = (parseInt(hex, 16) || index * 1337) % 9000 + 1000;
  return {
    id,
    displayId: String(num).slice(0, 4),
    name: user.name ?? profile.name ?? `Клиент ${String(num).slice(0, 4)}`,
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
    tags: profile.tags?.map((t: { tag: string }) => t.tag) ?? [],
    referralSource: profile.referralSource,
    gender: profile.gender,
    dateOfBirth: profile.dateOfBirth,
    createdAt: profile.createdAt ?? new Date().toISOString(),
  };
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CLIENTS: Client[] = [
  { id: 'a1b2c3d4-0001', displayId: '0001', name: 'Анна Соколова', email: 'anna.sokolova@mail.ru', phone: '+7 916 100-00-01', loyaltyTier: 'DIAMOND', loyaltyPoints: 4800, totalVisits: 54, totalSpent: 72400000, lastVisitAt: '2026-05-22', firstVisitAt: '2023-01-15', createdAt: '2023-01-15', tags: ['VIP', 'Постоянная'], referralSource: 'social', gender: 'female' },
  { id: 'a1b2c3d4-0002', displayId: '0002', name: 'Елена Морозова', email: 'e.morozova@gmail.com', phone: '+7 903 200-00-02', loyaltyTier: 'DIAMOND', loyaltyPoints: 3200, totalVisits: 48, totalSpent: 62000000, lastVisitAt: '2026-05-20', firstVisitAt: '2023-03-10', createdAt: '2023-03-10', tags: ['VIP'], referralSource: 'friend', gender: 'female' },
  { id: 'a1b2c3d4-0003', displayId: '0003', name: 'Наталья Попова', email: 'n.popova@yandex.ru', phone: '+7 925 300-00-03', loyaltyTier: 'GOLD', loyaltyPoints: 1850, totalVisits: 28, totalSpent: 38500000, lastVisitAt: '2026-05-18', firstVisitAt: '2024-01-20', createdAt: '2024-01-20', gender: 'female' },
  { id: 'a1b2c3d4-0004', displayId: '0004', name: 'Светлана Ким', email: 'svetlana@outlook.com', phone: '+7 916 400-00-04', loyaltyTier: 'GOLD', loyaltyPoints: 1420, totalVisits: 24, totalSpent: 31200000, lastVisitAt: '2026-05-15', firstVisitAt: '2024-02-05', createdAt: '2024-02-05', gender: 'female' },
  { id: 'a1b2c3d4-0005', displayId: '0005', name: 'Татьяна Лебедева', email: 't.lebedeva@mail.ru', phone: '+7 903 500-00-05', loyaltyTier: 'GOLD', loyaltyPoints: 980, totalVisits: 19, totalSpent: 24700000, lastVisitAt: '2026-05-21', firstVisitAt: '2024-03-12', createdAt: '2024-03-12', gender: 'female' },
  { id: 'a1b2c3d4-0006', displayId: '0006', name: 'Ольга Захарова', email: 'olga.z@gmail.com', phone: '+7 925 600-00-06', loyaltyTier: 'SILVER', loyaltyPoints: 540, totalVisits: 12, totalSpent: 15600000, lastVisitAt: '2026-04-28', firstVisitAt: '2024-06-01', createdAt: '2024-06-01', gender: 'female', churnRiskScore: 0.35 },
  { id: 'a1b2c3d4-0007', displayId: '0007', name: 'Ирина Волкова', email: 'irina.volkova@mail.ru', phone: '+7 916 700-00-07', loyaltyTier: 'SILVER', loyaltyPoints: 380, totalVisits: 9, totalSpent: 11700000, lastVisitAt: '2026-04-10', firstVisitAt: '2024-07-20', createdAt: '2024-07-20', gender: 'female', churnRiskScore: 0.55 },
  { id: 'a1b2c3d4-0008', displayId: '0008', name: 'Дарья Новикова', email: 'd.novikova@yandex.ru', phone: '+7 903 800-00-08', loyaltyTier: 'SILVER', loyaltyPoints: 290, totalVisits: 7, totalSpent: 9100000, lastVisitAt: '2026-05-05', firstVisitAt: '2024-09-15', createdAt: '2024-09-15', gender: 'female' },
  { id: 'a1b2c3d4-0009', displayId: '0009', name: 'Мария Кузнецова', email: 'masha.k@gmail.com', phone: '+7 925 900-00-09', loyaltyTier: 'BRONZE', loyaltyPoints: 120, totalVisits: 3, totalSpent: 3900000, lastVisitAt: '2026-03-20', firstVisitAt: '2025-01-10', createdAt: '2025-01-10', gender: 'female', churnRiskScore: 0.72 },
  { id: 'a1b2c3d4-0010', displayId: '0010', name: 'Юлия Смирнова', email: 'yu.smirnova@outlook.com', phone: '+7 916 000-00-10', loyaltyTier: 'BRONZE', loyaltyPoints: 80, totalVisits: 2, totalSpent: 2600000, lastVisitAt: '2026-02-14', firstVisitAt: '2025-02-01', createdAt: '2025-02-01', gender: 'female', churnRiskScore: 0.81 },
  { id: 'a1b2c3d4-0011', displayId: '0011', name: 'Алёна Петрова', email: 'alena.p@mail.ru', phone: '+7 903 111-11-11', loyaltyTier: 'BRONZE', loyaltyPoints: 50, totalVisits: 1, totalSpent: 1300000, lastVisitAt: '2026-05-23', firstVisitAt: '2026-05-23', createdAt: '2026-05-23', gender: 'female' },
  { id: 'a1b2c3d4-0012', displayId: '0012', name: 'Виктория Орлова', email: 'vika.orlova@yandex.ru', phone: '+7 925 222-22-22', loyaltyTier: 'GOLD', loyaltyPoints: 1100, totalVisits: 22, totalSpent: 28600000, lastVisitAt: '2026-05-19', firstVisitAt: '2024-04-08', createdAt: '2024-04-08', gender: 'female' },
];

// ─── Period analytics helpers ─────────────────────────────────────────────────

function generateSparkline(base: number, volatility = 0.15, points = 7): { v: number }[] {
  return Array.from({ length: points }, (_, i) => {
    const trend = 1 + (i / points) * 0.1;
    const noise = 1 + (Math.random() - 0.5) * volatility;
    return { v: Math.max(0, Math.round(base * trend * noise)) };
  });
}

interface AnalyticsData {
  active: number;
  inactive: number;
  gained: number;
  lost: number;
  activeSparkline: { v: number }[];
  inactiveSparkline: { v: number }[];
  gainedSparkline: { v: number }[];
  lostSparkline: { v: number }[];
}

function computeAnalytics(clients: Client[], _period: Period): AnalyticsData {
  const now = Date.now();
  const activeThreshold = 30 * 24 * 3600 * 1000;
  const active = clients.filter(c => c.lastVisitAt && (now - new Date(c.lastVisitAt).getTime()) < activeThreshold).length;
  const inactive = clients.length - active;
  const gained = clients.filter(c => c.createdAt && (now - new Date(c.createdAt).getTime()) < 30 * 24 * 3600 * 1000).length;
  const lost = clients.filter(c => c.churnRiskScore != null && c.churnRiskScore > 0.65).length;
  return {
    active, inactive, gained, lost,
    activeSparkline: generateSparkline(active, 0.12),
    inactiveSparkline: generateSparkline(inactive, 0.2),
    gainedSparkline: generateSparkline(gained, 0.25),
    lostSparkline: generateSparkline(lost, 0.3),
  };
}

// ─── Components ───────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  D: 'День', W: 'Неделя', M: 'Месяц', Q: 'Квартал', Y: 'Год', custom: 'Период',
};

function PeriodFilter({
  value, onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  const periods: Period[] = ['D', 'W', 'M', 'Q', 'Y'];
  return (
    <div className="flex items-center gap-1 p-1 bg-charcoal rounded-xl border border-border-luxury">
      {periods.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
            value === p
              ? 'bg-onyx text-champagne shadow-sm border border-border-light'
              : 'text-text-tertiary hover:text-text-secondary',
          )}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

const CHART_COLOR: Record<string, string> = {
  active: '#D4AF7A',
  inactive: '#6A6560',
  gained: '#8BA888',
  lost: '#C47878',
};

function MiniSparkline({ data, colorKey }: { data: { v: number }[]; colorKey: string }) {
  const color = CHART_COLOR[colorKey] ?? '#D4AF7A';
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${colorKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${colorKey})`}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ background: '#13131A', border: '1px solid #2A2A38', borderRadius: 8, fontSize: 11, padding: '4px 8px' }}
          itemStyle={{ color: color }}
          labelStyle={{ display: 'none' }}
          formatter={(v: number) => [v, '']}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface AnalyticsCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  sparkline: { v: number }[];
  colorKey: string;
  delta?: number;
  loading?: boolean;
}

function AnalyticsCard({ title, value, subtitle, icon, sparkline, colorKey, delta, loading }: AnalyticsCardProps) {
  const color = CHART_COLOR[colorKey] ?? '#D4AF7A';
  return (
    <div className="bg-onyx border border-border-luxury rounded-2xl p-5 flex flex-col gap-3 transition-all hover:border-border-light">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-charcoal rounded-lg mt-2 animate-shimmer" />
          ) : (
            <p className="font-serif text-3xl font-medium text-text-primary mt-1 leading-none">{value}</p>
          )}
          <p className="text-xs text-text-tertiary mt-1.5">{subtitle}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div>
        {loading ? (
          <div className="h-12 bg-charcoal rounded-lg animate-shimmer" />
        ) : (
          <MiniSparkline data={sparkline} colorKey={colorKey} />
        )}
      </div>
      {delta !== undefined && !loading && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className={cn('font-semibold', delta >= 0 ? 'text-sage' : 'text-red-400')}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
          <span className="text-text-tertiary">к предыдущему периоду</span>
        </div>
      )}
    </div>
  );
}

const LOYALTY_TIER_ORDER: LoyaltyTier[] = ['DIAMOND', 'GOLD', 'SILVER', 'BRONZE'];

function LoyaltyBadge({ tier }: { tier: LoyaltyTier }) {
  return (
    <Badge variant={getTierBadgeVariant(tier)} dot>
      {tier === 'DIAMOND' && <Crown className="w-2.5 h-2.5 mr-0.5" />}
      {getTierLabel(tier)}
    </Badge>
  );
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-20" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-champagne" />
    : <ChevronDown className="w-3 h-3 text-champagne" />;
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border-luxury">
          <td className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-charcoal animate-shimmer shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 bg-charcoal rounded animate-shimmer" />
                <div className="h-2.5 w-16 bg-charcoal rounded animate-shimmer" />
              </div>
            </div>
          </td>
          {[28, 20, 12, 20].map((w, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className={`h-3.5 bg-charcoal rounded animate-shimmer w-${w}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface AddClientDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (client: Client) => void;
}

function AddClientDialog({ open, onClose, onAdd }: AddClientDialogProps) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  function reset() { setName(''); setEmail(''); setPhone(''); }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    const newId = `new-${Date.now()}`;
    const displayId = String(1000 + Math.floor(Math.random() * 8999));
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }),
      });
    } catch { /* optimistic */ }
    onAdd({
      id: newId, displayId, name: name.trim(), email: email.trim(), phone: phone.trim(),
      loyaltyTier: 'BRONZE', loyaltyPoints: 0, totalVisits: 0, totalSpent: 0,
      createdAt: new Date().toISOString(),
    });
    reset();
    onClose();
    setSaving(false);
  }

  const inputCls = cn(
    'w-full px-3 py-2.5 rounded-xl text-sm',
    'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
    'focus:outline-none focus:border-champagne/50 transition-all',
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Новый клиент</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">Имя *</p>
            <input className={inputCls} placeholder="Полное имя" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">Телефон</p>
            <input className={inputCls} placeholder="+7 ..." value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-tertiary mb-1.5">Email</p>
            <input className={inputCls} placeholder="email@..." type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" size="sm" onClick={reset}>Отмена</Button>
          </DialogClose>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!name.trim() || saving} isLoading={saving}>
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function ClientsPage() {
  const { t } = useLocale();
  const router = useRouter();

  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<Period>('M');
  const [search, setSearch] = React.useState('');
  const [loyaltyFilter, setLoyaltyFilter] = React.useState<LoyaltyFilter>('ALL');
  const [sortField, setSortField] = React.useState<SortField>('totalSpent');
  const [sortDir, setSortDir] = React.useState<SortDir>('desc');
  const [page, setPage] = React.useState(1);
  const [addingClient, setAddingClient] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/customers?limit=100')
      .then(async res => {
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        if (cancelled) return;
        const raw = Array.isArray(json?.data?.items) ? json.data.items
          : Array.isArray(json?.data) ? json.data : [];
        const items = raw.map(normalizeClient);
        setClients(items.length > 0 ? items : MOCK_CLIENTS);
      })
      .catch(() => { if (!cancelled) setClients(MOCK_CLIENTS); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const analytics = React.useMemo(() => computeAnalytics(clients, period), [clients, period]);

  const filtered = React.useMemo(() => {
    let list = clients;
    if (loyaltyFilter !== 'ALL') list = list.filter(c => c.loyaltyTier === loyaltyFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.displayId.includes(q) ||
        (c.phone ?? '').includes(q),
      );
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name, 'ru'); break;
        case 'loyaltyTier': cmp = getTierRank(a.loyaltyTier) - getTierRank(b.loyaltyTier); break;
        case 'totalVisits': cmp = a.totalVisits - b.totalVisits; break;
        case 'totalSpent': cmp = a.totalSpent - b.totalSpent; break;
        case 'lastVisitAt':
          cmp = (a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0)
              - (b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [clients, search, loyaltyFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  }

  React.useEffect(() => { setPage(1); }, [search, loyaltyFilter]);

  const ThCol = ({ field, label, right }: { field: SortField; label: string; right?: boolean }) => (
    <th
      className={cn(
        'px-4 py-3 text-xs font-semibold uppercase tracking-widest text-text-tertiary cursor-pointer select-none whitespace-nowrap',
        'hover:text-text-secondary transition-colors',
        right ? 'text-right' : 'text-left',
      )}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-medium text-text-primary">{t('nav.clients')}</h1>
          <p className="text-sm text-text-secondary mt-0.5">Управление клиентской базой и лояльностью</p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodFilter value={period} onChange={p => { setPeriod(p); }} />
          <Button variant="primary" size="sm" leftIcon={<Users className="w-4 h-4" />} onClick={() => setAddingClient(true)}>
            Добавить
          </Button>
        </div>
      </div>

      {/* ── Analytics Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Активные клиенты"
          value={loading ? '—' : analytics.active}
          subtitle={`из ${clients.length} всего`}
          icon={<UserCheck className="w-5 h-5" />}
          sparkline={analytics.activeSparkline}
          colorKey="active"
          delta={8}
          loading={loading}
        />
        <AnalyticsCard
          title="Неактивные"
          value={loading ? '—' : analytics.inactive}
          subtitle="не посещали >30 дней"
          icon={<Users className="w-5 h-5" />}
          sparkline={analytics.inactiveSparkline}
          colorKey="inactive"
          delta={-3}
          loading={loading}
        />
        <AnalyticsCard
          title="Привлечено"
          value={loading ? '—' : analytics.gained}
          subtitle="новых за период"
          icon={<UserPlus className="w-5 h-5" />}
          sparkline={analytics.gainedSparkline}
          colorKey="gained"
          delta={12}
          loading={loading}
        />
        <AnalyticsCard
          title="Под риском"
          value={loading ? '—' : analytics.lost}
          subtitle="высокий churn score"
          icon={<UserMinus className="w-5 h-5" />}
          sparkline={analytics.lostSparkline}
          colorKey="lost"
          delta={-5}
          loading={loading}
        />
      </div>

      {/* ── Filters Row ───────────────────────────────────────────── */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Имя, email, телефон, ID..."
            className={cn(
              'w-full h-10 pl-9 pr-4 rounded-xl text-sm',
              'bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary',
              'focus:outline-none focus:border-champagne/40 transition-all',
            )}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Loyalty filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-text-tertiary shrink-0" />
          {(['ALL', ...LOYALTY_TIER_ORDER] as (LoyaltyFilter)[]).map(tier => (
            <button
              key={tier}
              onClick={() => { setLoyaltyFilter(tier); setPage(1); }}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                loyaltyFilter === tier
                  ? 'bg-champagne/10 text-champagne border-champagne/25'
                  : 'text-text-secondary hover:text-text-primary border-transparent hover:border-border-luxury hover:bg-charcoal',
              )}
            >
              {tier === 'DIAMOND' && <Crown className="w-3 h-3" />}
              {tier === 'ALL' ? 'Все' : getTierLabel(tier as LoyaltyTier)}
            </button>
          ))}
        </div>

        <div className="sm:ml-auto text-xs text-text-tertiary whitespace-nowrap">
          {filtered.length} клиентов
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury bg-charcoal/30">
                <ThCol field="name" label="Клиент" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary whitespace-nowrap">Email</th>
                <ThCol field="loyaltyTier" label="Лояльность" />
                <ThCol field="totalVisits" label="Визиты" right />
                <ThCol field="totalSpent" label="Потрачено" right />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {loading ? (
                <TableSkeleton />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-text-tertiary text-sm">
                    {search || loyaltyFilter !== 'ALL' ? 'Клиенты не найдены' : 'База клиентов пуста'}
                  </td>
                </tr>
              ) : (
                paginated.map(client => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="hover:bg-charcoal/40 transition-colors cursor-pointer group"
                  >
                    {/* Client */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={client.name} size="sm" />
                        <div className="min-w-0">
                          <div className="font-medium text-text-primary text-sm whitespace-nowrap group-hover:text-champagne transition-colors">
                            {client.name}
                          </div>
                          <div className="text-xs text-text-tertiary">
                            #{client.displayId}
                            {client.churnRiskScore != null && client.churnRiskScore > 0.65 && (
                              <span className="ml-2 text-red-400">⚠ риск оттока</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3.5 text-text-secondary text-xs max-w-[180px] truncate">
                      {client.email}
                    </td>
                    {/* Loyalty */}
                    <td className="px-4 py-3.5">
                      <LoyaltyBadge tier={client.loyaltyTier} />
                      <div className="text-xs text-text-tertiary mt-0.5">{client.loyaltyPoints} pts</div>
                    </td>
                    {/* Visits */}
                    <td className="px-4 py-3.5 text-right font-medium tabular-nums text-text-primary">
                      {client.totalVisits}
                    </td>
                    {/* Spent */}
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-champagne whitespace-nowrap">
                      {formatCurrency(client.totalSpent)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="px-5 py-3 border-t border-border-luxury flex items-center justify-between text-xs text-text-tertiary">
            <span>Стр. {page} из {totalPages} · {filtered.length} клиентов</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-charcoal disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = page <= 3 ? i + 1 : page + i - 2;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-xs font-medium transition-colors',
                      pg === page ? 'bg-champagne/15 text-champagne' : 'hover:bg-charcoal text-text-secondary',
                    )}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-charcoal disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && filtered.length <= PAGE_SIZE && (
          <div className="px-5 py-3 border-t border-border-luxury text-xs text-text-tertiary">
            {filtered.length} клиентов · Нажмите на строку, чтобы открыть профиль
          </div>
        )}
      </div>

      <AddClientDialog
        open={addingClient}
        onClose={() => setAddingClient(false)}
        onAdd={c => setClients(prev => [c, ...prev])}
      />
    </div>
  );
}
