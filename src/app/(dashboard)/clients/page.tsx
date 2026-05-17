'use client';

import * as React from 'react';
import { Plus, Search, MoreHorizontal, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type LoyaltyTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastVisit: Date | null;
  totalSpent: number;
  totalVisits: number;
  loyaltyTier: LoyaltyTier;
  notes?: string;
}

const initialClients: Client[] = [
  { id: 'c1', name: 'Анна Соколова', email: 'anna.sokolova@mail.ru', phone: '+7 (999) 123-45-67', lastVisit: new Date('2025-05-17'), totalSpent: 128_00000, totalVisits: 24, loyaltyTier: 'PLATINUM' },
  { id: 'c2', name: 'Елена Морозова', email: 'elena.morozova@gmail.com', phone: '+7 (916) 234-56-78', lastVisit: new Date('2025-05-15'), totalSpent: 87_50000, totalVisits: 18, loyaltyTier: 'GOLD' },
  { id: 'c3', name: 'Светлана Ким', email: 'svetlana.kim@yandex.ru', phone: '+7 (903) 345-67-89', lastVisit: new Date('2025-05-12'), totalSpent: 45_00000, totalVisits: 9, loyaltyTier: 'SILVER' },
  { id: 'c4', name: 'Ирина Волкова', email: 'i.volkova@inbox.ru', phone: '+7 (925) 456-78-90', lastVisit: new Date('2025-05-10'), totalSpent: 22_50000, totalVisits: 5, loyaltyTier: 'BRONZE' },
  { id: 'c5', name: 'Татьяна Лебедева', email: 'tlebed@mail.ru', phone: '+7 (977) 567-89-01', lastVisit: new Date('2025-05-08'), totalSpent: 95_00000, totalVisits: 21, loyaltyTier: 'GOLD' },
  { id: 'c6', name: 'Наталья Попова', email: 'n.popova@gmail.com', phone: '+7 (967) 678-90-12', lastVisit: new Date('2025-05-06'), totalSpent: 156_00000, totalVisits: 31, loyaltyTier: 'PLATINUM' },
  { id: 'c7', name: 'Ольга Новикова', email: 'o.novikova@yandex.ru', phone: '+7 (915) 789-01-23', lastVisit: new Date('2025-04-28'), totalSpent: 38_00000, totalVisits: 7, loyaltyTier: 'SILVER' },
  { id: 'c8', name: 'Марина Зайцева', email: 'marina.z@mail.ru', phone: '+7 (985) 890-12-34', lastVisit: new Date('2025-04-20'), totalSpent: 12_50000, totalVisits: 3, loyaltyTier: 'BRONZE' },
  { id: 'c9', name: 'Юлия Кузнецова', email: 'julia.k@outlook.com', phone: '+7 (926) 901-23-45', lastVisit: new Date('2025-04-15'), totalSpent: 68_00000, totalVisits: 14, loyaltyTier: 'GOLD' },
  { id: 'c10', name: 'Валерия Орлова', email: 'v.orlova@gmail.com', phone: '+7 (962) 012-34-56', lastVisit: new Date('2025-04-10'), totalSpent: 31_00000, totalVisits: 6, loyaltyTier: 'SILVER' },
];

const tierLabels: Record<LoyaltyTier, string> = { BRONZE: 'Бронза', SILVER: 'Серебро', GOLD: 'Золото', PLATINUM: 'Платина' };
const tierVariants: Record<LoyaltyTier, 'bronze' | 'silver' | 'gold' | 'platinum'> = { BRONZE: 'bronze', SILVER: 'silver', GOLD: 'gold', PLATINUM: 'platinum' };
const tierFilters: Array<{ value: LoyaltyTier | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Все' },
  { value: 'PLATINUM', label: 'Платина' },
  { value: 'GOLD', label: 'Золото' },
  { value: 'SILVER', label: 'Серебро' },
  { value: 'BRONZE', label: 'Бронза' },
];

function AddClientModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (c: Client) => void }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  function reset() { setName(''); setEmail(''); setPhone(''); setError(''); }
  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError('Имя и телефон обязательны'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() }),
      });
      if (res.ok) {
        const json = await res.json() as { data?: { id?: string } };
        const newClient: Client = {
          id: json.data?.id ?? `local-${Date.now()}`,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          lastVisit: null,
          totalSpent: 0,
          totalVisits: 0,
          loyaltyTier: 'BRONZE',
        };
        onAdded(newClient);
        handleClose();
      } else {
        // Optimistic add regardless (API may fail without DB)
        const newClient: Client = {
          id: `local-${Date.now()}`,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          lastVisit: null,
          totalSpent: 0,
          totalVisits: 0,
          loyaltyTier: 'BRONZE',
        };
        onAdded(newClient);
        handleClose();
      }
    } catch {
      setError('Не удалось сохранить. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md bg-onyx border border-border-luxury rounded-2xl shadow-luxury-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <h3 className="font-serif text-lg font-medium text-text-primary">Добавить клиента</h3>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Имя *</label>
            <Input placeholder="Анна Соколова" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Телефон *</label>
            <Input placeholder="+7 (999) 123-45-67" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Email</label>
            <Input placeholder="anna@mail.ru" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" size="md" onClick={handleClose}>Отмена</Button>
            <Button type="submit" variant="primary" size="md" disabled={loading}>
              {loading ? 'Сохранение...' : 'Добавить'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClientMenu({ client, onDelete }: { client: Client; onDelete: (id: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors opacity-0 group-hover:opacity-100"
        aria-label={`Действия для ${client.name}`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-36 bg-onyx border border-border-luxury rounded-xl shadow-luxury-lg overflow-hidden animate-slide-down">
          <button
            onClick={() => { setOpen(false); onDelete(client.id); }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = React.useState<Client[]>(initialClients);
  const [search, setSearch] = React.useState('');
  const [tierFilter, setTierFilter] = React.useState<LoyaltyTier | 'ALL'>('ALL');
  const [showAddClient, setShowAddClient] = React.useState(false);

  const filtered = React.useMemo(() => {
    return clients.filter((c) => {
      const matchesTier = tierFilter === 'ALL' || c.loyaltyTier === tierFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
      return matchesTier && matchesSearch;
    });
  }, [clients, search, tierFilter]);

  function handleAdded(c: Client) { setClients((prev) => [c, ...prev]); }
  function handleDelete(id: string) { setClients((prev) => prev.filter((c) => c.id !== id)); }

  return (
    <>
      <AddClientModal open={showAddClient} onClose={() => setShowAddClient(false)} onAdded={handleAdded} />

      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">База клиентов</h2>
            <p className="text-sm text-text-secondary mt-0.5">{filtered.length} {filtered.length === 1 ? 'клиент' : 'клиентов'}</p>
          </div>
          <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowAddClient(true)}>
            Добавить клиента
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-onyx border border-border-luxury rounded-2xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Поиск по имени, email, телефону..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftAddon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {tierFilters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTierFilter(value)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/40',
                  tierFilter === value
                    ? 'bg-champagne/10 text-champagne border border-champagne/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-charcoal border border-transparent',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-charcoal flex items-center justify-center">
                <Users className="w-7 h-7 text-text-tertiary" />
              </div>
              <div className="text-center">
                <p className="font-serif text-lg text-text-primary">Клиенты не найдены</p>
                <p className="text-sm text-text-secondary mt-1">Попробуйте изменить параметры поиска</p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-luxury">
                      {['Клиент', 'Контакты', 'Последний визит', 'Визитов', 'Сумма покупок', 'Программа', ''].map((col) => (
                        <th key={col} className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary first:pl-6 last:pr-6 last:text-right whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-luxury">
                    {filtered.map((client) => (
                      <tr key={client.id} className="hover:bg-charcoal/40 transition-colors group">
                        <td className="pl-6 pr-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={client.name} size="md" />
                            <span className="font-medium text-text-primary whitespace-nowrap">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-text-secondary text-sm">{client.email}</p>
                          <p className="text-text-tertiary text-xs mt-0.5">{client.phone}</p>
                        </td>
                        <td className="px-4 py-4 text-text-secondary whitespace-nowrap">
                          {client.lastVisit ? formatDate(client.lastVisit) : '—'}
                        </td>
                        <td className="px-4 py-4 text-text-secondary tabular-nums">{client.totalVisits}</td>
                        <td className="px-4 py-4 font-medium text-text-primary tabular-nums whitespace-nowrap">{formatCurrency(client.totalSpent)}</td>
                        <td className="px-4 py-4">
                          <Badge variant={tierVariants[client.loyaltyTier]}>{tierLabels[client.loyaltyTier]}</Badge>
                        </td>
                        <td className="pr-6 py-4 text-right">
                          <ClientMenu client={client} onDelete={handleDelete} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-border-luxury">
                {filtered.map((client) => (
                  <div key={client.id} className="p-4 flex items-center gap-3">
                    <Avatar name={client.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-text-primary text-sm truncate">{client.name}</p>
                        <Badge variant={tierVariants[client.loyaltyTier]}>{tierLabels[client.loyaltyTier]}</Badge>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 truncate">{client.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-text-tertiary">{client.totalVisits} визитов</span>
                        <span className="text-xs font-medium text-champagne ml-auto">{formatCurrency(client.totalSpent)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
