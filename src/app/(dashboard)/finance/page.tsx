'use client';

import * as React from 'react';
import {
  CreditCard, RefreshCw, Plus, Download, Trash2,
  TrendingUp, TrendingDown, Wallet, Receipt,
  AlertCircle, CheckCircle2, DollarSign,
  BarChart2, ArrowUpRight, ArrowDownLeft, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

// ─── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'payments' | 'closing' | 'expenses' | 'reports' | 'export';

interface Payment {
  id: string;
  appointmentId: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  isDeposit: boolean;
  description: string | null;
  paidAt: string | null;
  createdAt: string;
  appointment: {
    id: string;
    status: string;
    paymentStatus: string;
    totalPrice: number;
    paidAmount: number;
    discountAmount: number | null;
    client: string | null;
    specialist: string | null;
  } | null;
  refunds: { id: string; amount: number; status: string; reason: string | null }[];
  totalRefunded: number;
}

interface ClosingReport {
  date: string;
  revenue: {
    total: number;
    byCash: number;
    byCard: number;
    byTransfer: number;
    byOnline: number;
    byMethods: Record<string, number>;
  };
  refunds: { total: number; count: number };
  discounts: { total: number };
  expenses: { total: number; byCategory: Record<string, number>; items: { id: string; amount: number; category: string; description: string }[] };
  netRevenue: number;
  netProfit: number;
  outstanding: { total: number; count: number; items: { id: string; paymentStatus: string; totalPrice: number; paidAmount: number; balance: number; client: string | null }[] };
  completedBookings: number;
  paymentCount: number;
  specialistBreakdown: { name: string; revenue: number; count: number }[];
}

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  supplier: string | null;
  receiptRef: string | null;
  createdAt: string;
  createdBy: string | null;
}

interface Report {
  period: { from: string; to: string };
  summary: {
    totalRevenue: number;
    totalRefunds: number;
    totalDiscounts: number;
    netRevenue: number;
    totalExpenses: number;
    consumableCost: number;
    grossProfit: number;
    netProfit: number;
    totalOutstanding: number;
    completedBookings: number;
    avgCheck: number;
  };
  byPaymentMethod: Record<string, number>;
  specialists: { id: string; name: string; revenue: number; refunds: number; netRevenue: number; commissionEarned: number; procedureCount: number; avgCheck: number }[];
  services: { id: string; name: string; category: string; revenue: number; count: number; avgPrice: number }[];
  expenses: { total: number; byCategory: Record<string, number> };
  refunds: { total: number; count: number };
  unpaidBalances: { total: number; count: number };
}

// ─── Module-level lookup maps (keys only — no Russian strings) ─────────────────

const PROVIDER_KEY: Record<string, string> = {
  CASH:          'finance.method.cash',
  CARD_TERMINAL: 'finance.method.card',
  TRANSFER:      'finance.method.transfer',
  YOOKASSA:      'finance.method.yookassa',
  ROBOKASSA:     'finance.method.robokassa',
  INTERNAL:      'finance.method.internal',
};

const PAY_STATUS_KEY: Record<string, { key: string; color: string }> = {
  UNPAID:       { key: 'finance.payStatus.unpaid',   color: 'text-red-400' },
  DEPOSIT_PAID: { key: 'finance.payStatus.deposit',  color: 'text-amber-400' },
  PARTIAL_PAID: { key: 'finance.payStatus.partial',  color: 'text-amber-400' },
  PAID:         { key: 'finance.payStatus.paid',     color: 'text-emerald-400' },
  REFUNDED:     { key: 'finance.payStatus.refunded', color: 'text-blue-400' },
  FAILED:       { key: 'finance.payStatus.failed',   color: 'text-red-500' },
};

const EXPENSE_CAT_KEY: Record<string, string> = {
  INVENTORY_PURCHASE: 'finance.expense.purchase',
  RENT:               'finance.expense.rent',
  UTILITIES:          'finance.expense.utilities',
  SALARY:             'finance.expense.salary',
  OPERATIONAL:        'finance.expense.operational',
  MARKETING:          'finance.expense.marketing',
  OTHER:              'finance.expense.other',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function thirtyDaysAgo() {
  return new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0];
}

function authHeaders(): Record<string, string> {
  try {
    const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    if (!match) return { 'x-user-id': 'system', 'x-user-role': 'ADMIN' };
    const payload = JSON.parse(atob(match[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string; role?: string };
    return { 'x-user-id': payload.sub ?? 'system', 'x-user-role': payload.role ?? 'ADMIN' };
  } catch {
    return { 'x-user-id': 'system', 'x-user-role': 'ADMIN' };
  }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, trend }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-onyx border border-border-luxury rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-text-tertiary">{label}</span>
        <div className="w-8 h-8 rounded-lg luxury-gradient flex items-center justify-center">
          <Icon className="w-4 h-4 text-obsidian" />
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary font-serif">{value}</div>
      {sub && (
        <div className={cn('text-xs flex items-center gap-1', trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-text-tertiary')}>
          {trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
          {trend === 'down' && <ArrowDownLeft className="w-3 h-3" />}
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Payment creation modal ───────────────────────────────────────────────────

function PaymentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t, lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const providerLabels = Object.fromEntries(Object.entries(PROVIDER_KEY).map(([k, v]) => [k, t(v)]));

  const [form, setForm] = React.useState({
    appointmentId: '',
    provider: 'CASH',
    amount: '',
    isDeposit: false,
    description: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amount = Number(form.amount);
    if (!form.appointmentId.trim()) return setError(t('finance.modal.errNoId'));
    if (!amount || amount <= 0) return setError(t('finance.modal.errNoAmount'));

    setLoading(true);
    try {
      const res = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...form, amount }),
      });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) { setError(json.error?.message ?? t('common.error')); return; }
      onCreated();
      onClose();
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  void locale;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-text-primary font-serif mb-5">{t('finance.modal.newPayment')}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.modal.appointmentId')}</label>
            <input
              className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne"
              placeholder={t('finance.modal.uuid')}
              value={form.appointmentId}
              onChange={(e) => setForm((f) => ({ ...f, appointmentId: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.modal.method')}</label>
            <select
              className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne"
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
            >
              {Object.entries(providerLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.modal.amount')}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.modal.description')}</label>
            <input
              className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne"
              placeholder={t('finance.modal.optional')}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-champagne"
              checked={form.isDeposit}
              onChange={(e) => setForm((f) => ({ ...f, isDeposit: e.target.checked }))}
            />
            <span className="text-sm text-text-secondary">{t('finance.modal.deposit')}</span>
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border-luxury text-text-secondary text-sm hover:bg-charcoal transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg luxury-gradient text-obsidian text-sm font-semibold disabled:opacity-50">
              {loading ? t('finance.modal.creating') : t('finance.acceptPayment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Expense creation modal ───────────────────────────────────────────────────

function ExpenseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useLanguage();
  const expenseCatLabels = Object.fromEntries(Object.entries(EXPENSE_CAT_KEY).map(([k, v]) => [k, t(v)]));

  const [form, setForm] = React.useState({
    date: today(),
    category: 'OPERATIONAL',
    amount: '',
    description: '',
    supplier: '',
    receiptRef: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amount = Number(form.amount);
    if (!form.description.trim()) return setError(t('finance.modal.errNoDesc'));
    if (!amount || amount <= 0) return setError(t('finance.modal.errNoAmount'));

    setLoading(true);
    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...form, amount }),
      });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) { setError(json.error?.message ?? t('common.error')); return; }
      onCreated();
      onClose();
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-text-primary font-serif mb-5">{t('finance.modal.newExpense')}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.modal.date')}</label>
              <input type="date" className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.modal.amount')}</label>
              <input type="number" min="0" step="0.01" className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" placeholder="0.00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.modal.category')}</label>
            <select className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {Object.entries(expenseCatLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.modal.description')}</label>
            <input className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" placeholder={t('finance.modal.required')} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.modal.supplier')}</label>
              <input className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" placeholder={t('finance.modal.optional')} value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.modal.receiptRef')}</label>
              <input className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" placeholder={t('finance.modal.optional')} value={form.receiptRef} onChange={(e) => setForm((f) => ({ ...f, receiptRef: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border-luxury text-text-secondary text-sm hover:bg-charcoal transition-colors">{t('common.cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg luxury-gradient text-obsidian text-sm font-semibold disabled:opacity-50">{loading ? t('finance.modal.saving') : t('finance.modal.addExpenseBtn')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Refund modal ─────────────────────────────────────────────────────────────

function RefundModal({ paymentId, maxAmount, onClose, onRefunded }: {
  paymentId: string; maxAmount: number; onClose: () => void; onRefunded: () => void;
}) {
  const { t, lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';

  const [amount, setAmount] = React.useState(String(maxAmount));
  const [reason, setReason] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError(t('finance.modal.errNoRefund'));
    if (amt > maxAmount) return setError(`${t('finance.modal.refundMaxLabel')} ${fmt(maxAmount, locale)}`);

    setLoading(true);
    try {
      const res = await fetch(`/api/finance/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ amount: amt, reason: reason || undefined }),
      });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) { setError(json.error?.message ?? t('common.error')); return; }
      onRefunded();
      onClose();
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-text-primary font-serif mb-5">{t('finance.refund')}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">
              {t('finance.modal.refundMaxLabel')} {fmt(maxAmount, locale)})
            </label>
            <input type="number" min="0.01" max={maxAmount} step="0.01" className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.modal.reason')}</label>
            <input className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" placeholder={t('finance.modal.optional')} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border-luxury text-text-secondary text-sm hover:bg-charcoal transition-colors">{t('common.cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">{loading ? t('finance.modal.processing') : t('finance.refundAction')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { t, lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';

  const providerLabels = Object.fromEntries(Object.entries(PROVIDER_KEY).map(([k, v]) => [k, t(v)]));
  const payStatusLabels = Object.fromEntries(
    Object.entries(PAY_STATUS_KEY).map(([k, v]) => [k, { label: t(v.key), color: v.color }])
  );
  const expenseCatLabels = Object.fromEntries(Object.entries(EXPENSE_CAT_KEY).map(([k, v]) => [k, t(v)]));

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'payments', label: t('finance.tab.payments'), icon: CreditCard },
    { id: 'closing',  label: t('finance.tab.closing'),  icon: Receipt },
    { id: 'expenses', label: t('finance.tab.expenses'), icon: Wallet },
    { id: 'reports',  label: t('finance.tab.reports'),  icon: BarChart2 },
    { id: 'export',   label: t('finance.tab.export'),   icon: Download },
  ];

  const [tab, setTab] = React.useState<TabId>('payments');

  // Payments state
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = React.useState(false);
  const [payFrom, setPayFrom] = React.useState(thirtyDaysAgo());
  const [payTo, setPayTo]     = React.useState(today());
  const [showPayModal, setShowPayModal] = React.useState(false);
  const [refundTarget, setRefundTarget] = React.useState<{ id: string; amount: number } | null>(null);

  // Closing state
  const [closingDate, setClosingDate] = React.useState(today());
  const [closing, setClosing] = React.useState<ClosingReport | null>(null);
  const [closingLoading, setClosingLoading] = React.useState(false);

  // Expenses state
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [expLoading, setExpLoading] = React.useState(false);
  const [expFrom, setExpFrom] = React.useState(thirtyDaysAgo());
  const [expTo, setExpTo]     = React.useState(today());
  const [showExpModal, setShowExpModal] = React.useState(false);

  // Reports state
  const [report, setReport]   = React.useState<Report | null>(null);
  const [repLoading, setRepLoading] = React.useState(false);
  const [repFrom, setRepFrom] = React.useState(thirtyDaysAgo());
  const [repTo, setRepTo]     = React.useState(today());

  // Export state
  const [expExFrom, setExpExFrom] = React.useState(thirtyDaysAgo());
  const [expExTo, setExpExTo]     = React.useState(today());
  const [exporting, setExporting] = React.useState(false);

  // ── Fetch functions ──────────────────────────────────────────────────────────
  async function fetchPayments() {
    setPaymentsLoading(true);
    try {
      const res = await fetch(`/api/finance/payments?from=${payFrom}&to=${payTo}&limit=100`, { headers: authHeaders() });
      const json = await res.json() as { success: boolean; data?: { payments: Payment[] } };
      if (json.success && json.data) setPayments(json.data.payments);
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function fetchClosing() {
    setClosingLoading(true);
    try {
      const res = await fetch(`/api/finance/closing?date=${closingDate}`, { headers: authHeaders() });
      const json = await res.json() as { success: boolean; data?: ClosingReport };
      if (json.success && json.data) setClosing(json.data);
    } finally {
      setClosingLoading(false);
    }
  }

  async function fetchExpenses() {
    setExpLoading(true);
    try {
      const res = await fetch(`/api/finance/expenses?from=${expFrom}&to=${expTo}`, { headers: authHeaders() });
      const json = await res.json() as { success: boolean; data?: { expenses: Expense[] } };
      if (json.success && json.data) setExpenses(json.data.expenses);
    } finally {
      setExpLoading(false);
    }
  }

  async function fetchReport() {
    setRepLoading(true);
    try {
      const res = await fetch(`/api/finance/reports?from=${repFrom}&to=${repTo}`, { headers: authHeaders() });
      const json = await res.json() as { success: boolean; data?: Report };
      if (json.success && json.data) setReport(json.data);
    } finally {
      setRepLoading(false);
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm(t('finance.confirmDelete'))) return;
    const res = await fetch(`/api/finance/expenses/${id}`, { method: 'DELETE', headers: authHeaders() });
    const json = await res.json() as { success: boolean };
    if (json.success) fetchExpenses();
  }

  async function doExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/finance/export?from=${expExFrom}&to=${expExTo}`, { headers: authHeaders() });
      if (!res.ok) { alert(t('common.error')); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance_${expExFrom}_${expExTo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  React.useEffect(() => {
    if (tab === 'payments') fetchPayments();
    if (tab === 'closing') fetchClosing();
    if (tab === 'expenses') fetchExpenses();
    if (tab === 'reports') fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const totalReceived  = payments.reduce((s, p) => s + p.amount, 0);
  const totalRefundedP = payments.reduce((s, p) => s + p.totalRefunded, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-serif">{t('finance.title')}</h1>
          <p className="text-sm text-text-tertiary mt-0.5">{t('finance.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-obsidian/60 p-1 rounded-xl border border-border-luxury w-fit flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === id
                ? 'luxury-gradient text-obsidian shadow-sm'
                : 'text-text-tertiary hover:text-text-primary hover:bg-charcoal',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── PAYMENTS TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'payments' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label={t('finance.total.received')}     value={fmt(totalReceived, locale)}                  icon={ArrowUpRight} />
            <KpiCard label={t('finance.total.refunded')}     value={fmt(totalRefundedP, locale)}                 icon={ArrowDownLeft} />
            <KpiCard label={t('finance.total.net')}          value={fmt(totalReceived - totalRefundedP, locale)} icon={DollarSign} />
            <KpiCard label={t('finance.total.transactions')} value={String(payments.length)}                     icon={CreditCard} />
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-text-tertiary block mb-1">{t('finance.from')}</label>
              <input type="date" className="bg-onyx border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={payFrom} onChange={(e) => setPayFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary block mb-1">{t('finance.to')}</label>
              <input type="date" className="bg-onyx border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={payTo} onChange={(e) => setPayTo(e.target.value)} />
            </div>
            <button onClick={fetchPayments} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-luxury text-text-secondary text-sm hover:bg-charcoal transition-colors">
              <RefreshCw className="w-4 h-4" /> {t('finance.refresh')}
            </button>
            <button onClick={() => setShowPayModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg luxury-gradient text-obsidian text-sm font-semibold ml-auto">
              <Plus className="w-4 h-4" /> {t('finance.acceptPayment')}
            </button>
          </div>

          <div className="bg-onyx border border-border-luxury rounded-xl overflow-hidden">
            {paymentsLoading ? (
              <div className="flex items-center justify-center h-32"><RefreshCw className="w-6 h-6 text-champagne animate-spin" /></div>
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-text-tertiary gap-2">
                <CreditCard className="w-8 h-8 opacity-40" />
                <span className="text-sm">{t('finance.noPayments')}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-luxury">
                      <th className="px-4 py-3 text-left text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.date')}</th>
                      <th className="px-4 py-3 text-left text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.client')}</th>
                      <th className="px-4 py-3 text-left text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.specialist')}</th>
                      <th className="px-4 py-3 text-left text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.method')}</th>
                      <th className="px-4 py-3 text-right text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.amount')}</th>
                      <th className="px-4 py-3 text-left text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.status')}</th>
                      <th className="px-4 py-3 text-left text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.payStatus')}</th>
                      <th className="px-4 py-3 text-center text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((pmt) => {
                      const ps = payStatusLabels[pmt.appointment?.paymentStatus ?? ''];
                      const refundable = pmt.amount - pmt.totalRefunded;
                      return (
                        <tr key={pmt.id} className="border-b border-border-luxury/40 hover:bg-charcoal/30 transition-colors">
                          <td className="px-4 py-3 text-text-secondary">{pmt.paidAt ? fmtDate(pmt.paidAt, locale) : '—'}</td>
                          <td className="px-4 py-3 text-text-primary font-medium">{pmt.appointment?.client ?? '—'}</td>
                          <td className="px-4 py-3 text-text-secondary">{pmt.appointment?.specialist ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-charcoal text-xs text-text-secondary">
                              {providerLabels[pmt.provider] ?? pmt.provider}
                              {pmt.isDeposit && <span className="text-amber-400 text-[10px]">{t('finance.payStatus.deposit')}</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-text-primary">{fmt(pmt.amount, locale)}</td>
                          <td className="px-4 py-3">
                            {pmt.totalRefunded > 0 && (
                              <span className="text-xs text-blue-400">−{fmt(pmt.totalRefunded, locale)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {ps ? (
                              <span className={cn('text-xs font-medium', ps.color)}>{ps.label}</span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {refundable > 0.01 && pmt.status === 'CAPTURED' && (
                              <button
                                onClick={() => setRefundTarget({ id: pmt.id, amount: refundable })}
                                className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                              >
                                {t('finance.refundBtn')}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CLOSING TAB ──────────────────────────────────────────────────────────── */}
      {tab === 'closing' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-text-tertiary block mb-1">{t('finance.closeDate')}</label>
              <input type="date" className="bg-onyx border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} />
            </div>
            <button onClick={fetchClosing} className="flex items-center gap-2 px-4 py-2 rounded-lg luxury-gradient text-obsidian text-sm font-semibold">
              <Receipt className="w-4 h-4" /> {t('finance.generate')}
            </button>
          </div>

          {closingLoading && (
            <div className="flex items-center justify-center h-32"><RefreshCw className="w-6 h-6 text-champagne animate-spin" /></div>
          )}

          {closing && !closingLoading && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label={t('finance.kpi.revenue')} value={fmt(closing.revenue.total, locale)} icon={TrendingUp} trend="up" sub={`${closing.completedBookings} ${t('finance.procedures')}`} />
                <KpiCard label={t('finance.kpi.returns')} value={fmt(closing.refunds.total, locale)} icon={TrendingDown} trend="down" sub={`${closing.refunds.count} ${t('finance.pcs')}`} />
                <KpiCard label={t('finance.kpi.net')} value={fmt(closing.netRevenue, locale)} icon={DollarSign} />
                <KpiCard label={t('finance.kpi.profit')} value={fmt(closing.netProfit, locale)} icon={BarChart2} trend={closing.netProfit >= 0 ? 'up' : 'down'} sub={`${t('finance.tab.expenses')}: ${fmt(closing.expenses.total, locale)}`} />
              </div>

              <div className="grid lg:grid-cols-2 gap-5">
                <div className="bg-onyx border border-border-luxury rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">{t('finance.revenueByMethod')}</h3>
                  <div className="space-y-2">
                    {[
                      { label: t('finance.method.cash'),     value: closing.revenue.byCash },
                      { label: t('finance.method.card'),     value: closing.revenue.byCard },
                      { label: t('finance.method.transfer'), value: closing.revenue.byTransfer },
                      { label: t('finance.online'),          value: closing.revenue.byOnline },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center py-1 border-b border-border-luxury/30">
                        <span className="text-sm text-text-secondary">{label}</span>
                        <span className="text-sm font-semibold text-text-primary">{fmt(value, locale)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-bold text-champagne">{t('finance.expTotal').replace(':', '')}</span>
                      <span className="text-sm font-bold text-champagne">{fmt(closing.revenue.total, locale)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-onyx border border-border-luxury rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
                    {t('finance.outstanding')} <span className="text-red-400">({fmt(closing.outstanding.total, locale)})</span>
                  </h3>
                  {closing.outstanding.items.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm"><CheckCircle2 className="w-4 h-4" /> {t('finance.allPaid')}</div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {closing.outstanding.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm border-b border-border-luxury/30 py-1.5">
                          <span className="text-text-secondary">{item.client ?? t('finance.col.client')}</span>
                          <div className="flex items-center gap-2">
                            <span className={payStatusLabels[item.paymentStatus]?.color ?? 'text-text-tertiary'}>{payStatusLabels[item.paymentStatus]?.label}</span>
                            <span className="text-red-400 font-semibold">{fmt(item.balance, locale)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {closing.specialistBreakdown.length > 0 && (
                <div className="bg-onyx border border-border-luxury rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">{t('finance.specialistRevenue')}</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {closing.specialistBreakdown.map((spec) => (
                      <div key={spec.name} className="flex justify-between items-center bg-charcoal rounded-lg p-3">
                        <div>
                          <div className="text-sm font-medium text-text-primary">{spec.name}</div>
                          <div className="text-xs text-text-tertiary">{spec.count} {t('finance.procedures')}</div>
                        </div>
                        <div className="text-sm font-bold text-champagne">{fmt(spec.revenue, locale)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!closing && !closingLoading && (
            <div className="flex flex-col items-center justify-center h-40 text-text-tertiary gap-2">
              <Receipt className="w-10 h-10 opacity-30" />
              <span className="text-sm">{t('finance.closeHint')}</span>
            </div>
          )}
        </div>
      )}

      {/* ── EXPENSES TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'expenses' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-text-tertiary block mb-1">{t('finance.from')}</label>
              <input type="date" className="bg-onyx border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={expFrom} onChange={(e) => setExpFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary block mb-1">{t('finance.to')}</label>
              <input type="date" className="bg-onyx border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={expTo} onChange={(e) => setExpTo(e.target.value)} />
            </div>
            <button onClick={fetchExpenses} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-luxury text-text-secondary text-sm hover:bg-charcoal transition-colors">
              <RefreshCw className="w-4 h-4" /> {t('finance.refresh')}
            </button>
            <button onClick={() => setShowExpModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg luxury-gradient text-obsidian text-sm font-semibold ml-auto">
              <Plus className="w-4 h-4" /> {t('finance.addExpense')}
            </button>
          </div>

          <div className="bg-onyx border border-border-luxury rounded-xl overflow-hidden">
            {expLoading ? (
              <div className="flex items-center justify-center h-32"><RefreshCw className="w-6 h-6 text-champagne animate-spin" /></div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-text-tertiary gap-2">
                <Wallet className="w-8 h-8 opacity-40" />
                <span className="text-sm">{t('finance.noExpenses')}</span>
              </div>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-border-luxury flex justify-between items-center">
                  <span className="text-sm text-text-tertiary">{t('finance.expTotal')}</span>
                  <span className="text-base font-bold text-text-primary font-serif">{fmt(expenses.reduce((s, e) => s + e.amount, 0), locale)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-luxury">
                        <th className="px-4 py-3 text-left text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.date')}</th>
                        <th className="px-4 py-3 text-left text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.category')}</th>
                        <th className="px-4 py-3 text-right text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.amount')}</th>
                        <th className="px-4 py-3 text-left text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.desc')}</th>
                        <th className="px-4 py-3 text-left text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.supplier')}</th>
                        <th className="px-4 py-3 text-center text-xs text-text-tertiary uppercase tracking-wider">{t('finance.col.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id} className="border-b border-border-luxury/40 hover:bg-charcoal/30 transition-colors">
                          <td className="px-4 py-3 text-text-secondary">{fmtDate(e.date + 'T00:00:00', locale)}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-charcoal text-xs text-text-secondary">{expenseCatLabels[e.category] ?? e.category}</span></td>
                          <td className="px-4 py-3 text-right font-semibold text-text-primary">{fmt(e.amount, locale)}</td>
                          <td className="px-4 py-3 text-text-secondary max-w-xs truncate">{e.description}</td>
                          <td className="px-4 py-3 text-text-tertiary text-xs">{e.supplier ?? '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => deleteExpense(e.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ──────────────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-text-tertiary block mb-1">{t('finance.from')}</label>
              <input type="date" className="bg-onyx border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={repFrom} onChange={(e) => setRepFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-tertiary block mb-1">{t('finance.to')}</label>
              <input type="date" className="bg-onyx border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={repTo} onChange={(e) => setRepTo(e.target.value)} />
            </div>
            <button onClick={fetchReport} className="flex items-center gap-2 px-4 py-2 rounded-lg luxury-gradient text-obsidian text-sm font-semibold">
              <BarChart2 className="w-4 h-4" /> {t('finance.generate')}
            </button>
          </div>

          {repLoading && <div className="flex items-center justify-center h-32"><RefreshCw className="w-6 h-6 text-champagne animate-spin" /></div>}

          {report && !repLoading && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label={t('finance.kpi.revenue')}   value={fmt(report.summary.totalRevenue, locale)} icon={TrendingUp} trend="up" sub={`${report.summary.completedBookings} ${t('finance.procedures')}`} />
                <KpiCard label={t('finance.netRevenue')}    value={fmt(report.summary.netRevenue, locale)}   icon={DollarSign} sub={`${t('finance.kpi.returns')}: −${fmt(report.summary.totalRefunds, locale)}`} />
                <KpiCard label={t('finance.grossProfit')}   value={fmt(report.summary.grossProfit, locale)}  icon={CheckCircle2} />
                <KpiCard label={t('finance.kpi.profit')}    value={fmt(report.summary.netProfit, locale)}    icon={BarChart2} trend={report.summary.netProfit >= 0 ? 'up' : 'down'} sub={`${t('finance.tab.expenses')}: −${fmt(report.summary.totalExpenses, locale)}`} />
              </div>

              <div className="grid lg:grid-cols-2 gap-5">
                <div className="bg-onyx border border-border-luxury rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">{t('finance.specialists')}</h3>
                  <div className="space-y-2">
                    {report.specialists.slice(0, 10).map((sp) => (
                      <div key={sp.id} className="flex justify-between items-center border-b border-border-luxury/30 py-2">
                        <div>
                          <div className="text-sm text-text-primary font-medium">{sp.name}</div>
                          <div className="text-xs text-text-tertiary">{sp.procedureCount} {t('finance.procedures')} · {t('finance.avgCheckLabel')} {fmt(sp.avgCheck, locale)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-champagne">{fmt(sp.netRevenue, locale)}</div>
                          {sp.refunds > 0 && <div className="text-xs text-red-400">−{fmt(sp.refunds, locale)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-onyx border border-border-luxury rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">{t('finance.services')}</h3>
                  <div className="space-y-2">
                    {report.services.slice(0, 10).map((svc) => (
                      <div key={svc.id} className="flex justify-between items-center border-b border-border-luxury/30 py-2">
                        <div>
                          <div className="text-sm text-text-primary">{svc.name}</div>
                          <div className="text-xs text-text-tertiary">{svc.count} {t('finance.pcs')} · {t('finance.avgCheckLabel')} {fmt(svc.avgPrice, locale)}</div>
                        </div>
                        <div className="text-sm font-bold text-champagne">{fmt(svc.revenue, locale)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-5">
                <div className="bg-onyx border border-border-luxury rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">{t('finance.byMethod')}</h3>
                  <div className="space-y-2">
                    {Object.entries(report.byPaymentMethod).map(([method, amount]) => (
                      <div key={method} className="flex justify-between border-b border-border-luxury/30 py-1.5">
                        <span className="text-sm text-text-secondary">{providerLabels[method] ?? method}</span>
                        <span className="text-sm font-semibold text-text-primary">{fmt(amount, locale)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-onyx border border-border-luxury rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">{t('finance.debtStatus')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-sm text-text-secondary">{t('finance.unpaidBalances')}</span><span className="text-sm font-bold text-red-400">{fmt(report.unpaidBalances.total, locale)}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-text-secondary">{t('finance.recordCount')}</span><span className="text-sm text-text-primary">{report.unpaidBalances.count}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-text-secondary">{t('finance.avgCheckLabel')}</span><span className="text-sm text-champagne font-semibold">{fmt(report.summary.avgCheck, locale)}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-text-secondary">{t('finance.consumableCost')}</span><span className="text-sm text-amber-400">{fmt(report.summary.consumableCost, locale)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!report && !repLoading && (
            <div className="flex flex-col items-center justify-center h-40 text-text-tertiary gap-2">
              <FileText className="w-10 h-10 opacity-30" />
              <span className="text-sm">{t('finance.reportHint')}</span>
            </div>
          )}
        </div>
      )}

      {/* ── EXPORT TAB ───────────────────────────────────────────────────────────── */}
      {tab === 'export' && (
        <div className="space-y-5 max-w-lg">
          <div className="bg-onyx border border-border-luxury rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-text-primary font-serif mb-1">{t('finance.exportTitle')}</h3>
              <p className="text-sm text-text-tertiary">{t('finance.exportDesc')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.from')}</label>
                <input type="date" className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={expExFrom} onChange={(e) => setExpExFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1">{t('finance.to')}</label>
                <input type="date" className="w-full bg-charcoal border border-border-luxury rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-champagne" value={expExTo} onChange={(e) => setExpExTo(e.target.value)} />
              </div>
            </div>
            <button
              onClick={doExport}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl luxury-gradient text-obsidian font-semibold text-sm disabled:opacity-50 transition-opacity"
            >
              <Download className="w-5 h-5" />
              {exporting ? t('finance.downloading') : t('finance.download')}
            </button>
            <div className="text-xs text-text-tertiary space-y-1">
              <p>{t('finance.exportSheets')}</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>{t('finance.exportSheet.payments')}</li>
                <li>{t('finance.exportSheet.refunds')}</li>
                <li>{t('finance.exportSheet.expenses')}</li>
                <li>{t('finance.exportSheet.specialists')}</li>
                <li>{t('finance.exportSheet.pl')}</li>
              </ul>
            </div>
          </div>

          <div className="bg-onyx border border-border-luxury rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary space-y-1">
                <p>{t('finance.exportNote1')} <span className="text-champagne font-medium">.xlsx</span></p>
                <p>{t('finance.exportNote2')}</p>
                <p>{t('finance.exportNote3')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────────────── */}
      {showPayModal && (
        <PaymentModal onClose={() => setShowPayModal(false)} onCreated={fetchPayments} />
      )}
      {showExpModal && (
        <ExpenseModal onClose={() => setShowExpModal(false)} onCreated={fetchExpenses} />
      )}
      {refundTarget && (
        <RefundModal
          paymentId={refundTarget.id}
          maxAmount={refundTarget.amount}
          onClose={() => setRefundTarget(null)}
          onRefunded={fetchPayments}
        />
      )}
    </div>
  );
}
