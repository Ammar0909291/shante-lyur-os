'use client';

import * as React from 'react';
import { Users, Plus, Search, Star, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { CreateClientDialog } from '@/components/dialogs/create-client-dialog';
import { ClientDetailDialog } from '@/components/dialogs/client-detail-dialog';
import { apiGet } from '@/lib/api-client';
import { useT } from '@/lib/i18n-context';
import * as XLSX from 'xlsx';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
  totalSpent: number;
  tier: string;
  lastVisit: string;
}

const mockClients: Client[] = [
  { id: '1', name: 'Анна Соколова', email: 'a.sokolova@mail.ru', phone: '+7 (916) 123-45-67', visits: 24, totalSpent: 18600000, tier: 'GOLD', lastVisit: '15 мая 2025' },
  { id: '2', name: 'Елена Морозова', email: 'e.morozova@mail.ru', phone: '+7 (905) 234-56-78', visits: 18, totalSpent: 12400000, tier: 'SILVER', lastVisit: '12 мая 2025' },
  { id: '3', name: 'Светлана Ким', email: 's.kim@gmail.com', phone: '+7 (926) 345-67-89', visits: 7, totalSpent: 4200000, tier: 'BRONZE', lastVisit: '10 мая 2025' },
  { id: '4', name: 'Ирина Волкова', email: 'i.volkova@yandex.ru', phone: '+7 (903) 456-78-90', visits: 31, totalSpent: 27800000, tier: 'PLATINUM', lastVisit: '19 мая 2025' },
  { id: '5', name: 'Татьяна Лебедева', email: 't.lebedeva@mail.ru', phone: '+7 (917) 567-89-01', visits: 15, totalSpent: 10100000, tier: 'SILVER', lastVisit: '8 мая 2025' },
  { id: '6', name: 'Наталья Попова', email: 'n.popova@gmail.com', phone: '+7 (921) 678-90-12', visits: 42, totalSpent: 38500000, tier: 'PLATINUM', lastVisit: '18 мая 2025' },
  { id: '7', name: 'Ольга Новикова', email: 'o.novikova@mail.ru', phone: '+7 (906) 789-01-23', visits: 5, totalSpent: 2800000, tier: 'BRONZE', lastVisit: '1 мая 2025' },
  { id: '8', name: 'Марина Зайцева', email: 'm.zaiceva@yandex.ru', phone: '+7 (925) 890-12-34', visits: 11, totalSpent: 7600000, tier: 'SILVER', lastVisit: '14 мая 2025' },
];

const tierVariants: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  BRONZE: 'default',
  SILVER: 'info',
  GOLD: 'warning',
  PLATINUM: 'success',
};

const tierLabels: Record<string, string> = {
  BRONZE: 'Бронза',
  SILVER: 'Серебро',
  GOLD: 'Золото',
  PLATINUM: 'Платина',
};

export default function ClientsPage() {
  const [clients, setClients] = React.useState<Client[]>(mockClients);
  const [search, setSearch] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const t = useT();

  React.useEffect(() => {
    apiGet<{ items: Client[]; total: number }>('/api/customers')
      .then((res) => { if (res.items?.length) setClients(res.items); })
      .catch(() => {/* use mock */});
  }, []);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search),
  );

  function handleCreated() {
    apiGet<{ items: Client[]; total: number }>('/api/customers')
      .then((res) => { if (res.items?.length) setClients(res.items); })
      .catch(() => {});
  }

  function handleExportXlsx() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Имя', 'Email', 'Телефон', 'Визитов', 'Потрачено (₽)', 'Уровень', 'Последний визит'],
      ...filtered.map((c) => [c.name, c.email, c.phone, c.visits, (c.totalSpent / 100).toFixed(2), tierLabels[c.tier] ?? c.tier, c.lastVisit]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Клиенты');
    XLSX.writeFile(wb, 'clients.xlsx');
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">{t('page.clients')}</h2>
          <p className="text-text-secondary mt-1 text-sm">База клиентов студии</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportXlsx}>
            {t('btn.export')}
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            {t('btn.addClient')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Всего клиентов', value: clients.length.toString() },
          { label: 'Новых за месяц', value: '+23' },
          { label: 'Активных', value: clients.filter((c) => c.visits > 0).length.toString() },
          { label: 'Среднее визитов', value: clients.length ? (clients.reduce((s, c) => s + c.visits, 0) / clients.length).toFixed(1) : '0' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-onyx border border-border-luxury rounded-xl px-4 py-3">
            <p className="text-xs text-text-tertiary">{label}</p>
            <p className="text-xl font-semibold text-text-primary mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-champagne" />
            <h3 className="font-serif text-base font-medium text-text-primary">Все клиенты</h3>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="search"
              placeholder="Поиск клиента..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-charcoal border border-border-luxury rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-champagne/40 w-44"
            />
          </div>
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-luxury">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Контакт</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Визитов</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Потрачено</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Уровень</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">Последний визит</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-luxury">
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-charcoal/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedClient(client)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={client.name} size="sm" />
                      <span className="font-medium text-text-primary whitespace-nowrap">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-text-secondary text-xs">{client.email}</div>
                    <div className="text-text-tertiary text-xs mt-0.5">{client.phone}</div>
                  </td>
                  <td className="px-4 py-4 tabular-nums text-text-secondary">{client.visits}</td>
                  <td className="px-4 py-4 tabular-nums font-medium text-text-primary">{formatCurrency(client.totalSpent)}</td>
                  <td className="px-4 py-4">
                    <Badge variant={tierVariants[client.tier]}>
                      <Star className="w-3 h-3 mr-1" />
                      {tierLabels[client.tier]}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-text-secondary text-xs">{client.lastVisit}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-tertiary text-sm">
                    Клиенты не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-border-luxury">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="px-4 py-4 flex items-center gap-3 cursor-pointer hover:bg-charcoal/50 transition-colors"
              onClick={() => setSelectedClient(client)}
            >
              <Avatar name={client.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary text-sm truncate">{client.name}</span>
                  <Badge variant={tierVariants[client.tier]}>{tierLabels[client.tier]}</Badge>
                </div>
                <p className="text-xs text-text-tertiary mt-0.5">{client.visits} визитов · {formatCurrency(client.totalSpent)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} />
      <ClientDetailDialog
        client={selectedClient}
        open={!!selectedClient}
        onOpenChange={(o) => { if (!o) setSelectedClient(null); }}
        onChanged={handleCreated}
      />
    </div>
  );
}
