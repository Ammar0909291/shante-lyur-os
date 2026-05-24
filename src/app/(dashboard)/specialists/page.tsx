'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, Plus, X, Star, MoreVertical, Power, RotateCcw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

type SpecialistDepartment = 'COSMETOLOGY' | 'MASSAGE' | 'RECEPTION' | 'MANAGEMENT';

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: SpecialistDepartment;
  specialization: string | null;
  bio: string | null;
  experienceYears: number | null;
  rating: number | null;
  reviewCount: number;
  status: string;
  color: string | null;
}

// ─── Department badge ──────────────────────────────────────────────────────────

const DEPT_STYLE: Record<SpecialistDepartment, string> = {
  COSMETOLOGY: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  MASSAGE:     'bg-amber-500/10  text-amber-300  border-amber-500/20',
  RECEPTION:   'bg-sky-500/10    text-sky-300    border-sky-500/20',
  MANAGEMENT:  'bg-rose-500/10   text-rose-300   border-rose-500/20',
};

const DEPT_LABEL: Record<SpecialistDepartment, string> = {
  COSMETOLOGY: 'Cosmetology',
  MASSAGE:     'Massage',
  RECEPTION:   'Reception',
  MANAGEMENT:  'Management',
};

function DeptBadge({ dept }: { dept: SpecialistDepartment }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border', DEPT_STYLE[dept])}>
      {DEPT_LABEL[dept]}
    </span>
  );
}

const inputCls = cn(
  'w-full px-3.5 py-2.5 rounded-xl text-sm',
  'bg-obsidian border border-border-luxury',
  'text-text-primary placeholder:text-text-tertiary',
  'focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40',
  'transition-all',
);

const selectCls = cn(inputCls, 'cursor-pointer');

// ─── Department selector ───────────────────────────────────────────────────────

const DEPARTMENTS: SpecialistDepartment[] = ['COSMETOLOGY', 'MASSAGE', 'RECEPTION', 'MANAGEMENT'];

function DeptSelect({
  value,
  onChange,
  className,
}: {
  value: SpecialistDepartment;
  onChange: (v: SpecialistDepartment) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SpecialistDepartment)}
      className={cn(selectCls, className)}
    >
      {DEPARTMENTS.map((d) => (
        <option key={d} value={d}>{DEPT_LABEL[d]}</option>
      ))}
    </select>
  );
}

// ─── Specialist card ───────────────────────────────────────────────────────────

function SpecialistCard({
  specialist,
  statusLabel,
  t,
  onStatusChange,
  onDeptChange,
}: {
  specialist: Specialist;
  statusLabel: string;
  t: (key: string) => string;
  onStatusChange: (id: string, status: string) => void;
  onDeptChange: (id: string, dept: SpecialistDepartment) => void;
}) {
  const [menuOpen, setMenuOpen]   = React.useState(false);
  const [updating, setUpdating]   = React.useState(false);
  const [editDept, setEditDept]   = React.useState(false);
  const [deptVal, setDeptVal]     = React.useState<SpecialistDepartment>(specialist.department);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const setStatus = async (status: string) => {
    setMenuOpen(false);
    setUpdating(true);
    try {
      const res  = await fetch(`/api/specialists/${specialist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json() as { success: boolean };
      if (json.success) onStatusChange(specialist.id, status);
    } finally {
      setUpdating(false);
    }
  };

  const saveDept = async () => {
    setUpdating(true);
    try {
      const res  = await fetch(`/api/specialists/${specialist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: deptVal }),
      });
      const json = await res.json() as { success: boolean };
      if (json.success) {
        onDeptChange(specialist.id, deptVal);
        setEditDept(false);
      }
    } finally {
      setUpdating(false);
    }
  };

  const isActive = specialist.status === 'ACTIVE';

  return (
    <div
      className={cn(
        'bg-onyx border rounded-2xl p-5 flex flex-col gap-3 transition-all',
        isActive
          ? 'border-border-luxury hover:border-champagne/30'
          : 'border-border-luxury opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar name={`${specialist.firstName} ${specialist.lastName}`} size="md" />
          {specialist.color && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-onyx"
              style={{ backgroundColor: specialist.color }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary leading-tight">
            {specialist.firstName} {specialist.lastName}
          </p>
          {specialist.specialization && (
            <p className="text-xs text-text-secondary mt-0.5 truncate">{specialist.specialization}</p>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            disabled={updating}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
          >
            {updating
              ? <div className="w-4 h-4 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
              : <MoreVertical className="w-4 h-4" />}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 bg-onyx border border-border-luxury rounded-xl shadow-luxury-lg min-w-48 py-1 animate-slide-down">
              <button
                onClick={() => { setMenuOpen(false); setEditDept(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-charcoal hover:text-text-primary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Change department
              </button>
              <div className="border-t border-border-luxury my-1" />
              {isActive ? (
                <button
                  onClick={() => setStatus('INACTIVE')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  <Power className="w-4 h-4" />
                  {t('specialists.deactivate')}
                </button>
              ) : (
                <button
                  onClick={() => setStatus('ACTIVE')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-charcoal hover:text-text-primary transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('specialists.restore')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Department badge / inline editor */}
      {editDept ? (
        <div className="flex items-center gap-2">
          <select
            value={deptVal}
            onChange={(e) => setDeptVal(e.target.value as SpecialistDepartment)}
            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-obsidian border border-border-luxury text-text-primary focus:outline-none focus:border-champagne/40"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{DEPT_LABEL[d]}</option>
            ))}
          </select>
          <button onClick={saveDept} disabled={updating}
            className="px-2.5 py-1.5 rounded-lg bg-champagne text-obsidian text-xs font-medium hover:bg-champagne/90 transition-colors disabled:opacity-50">
            Save
          </button>
          <button onClick={() => { setEditDept(false); setDeptVal(specialist.department); }}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <DeptBadge dept={specialist.department} />
          <Badge variant={isActive ? 'success' : 'default'} dot>
            {statusLabel}
          </Badge>
          {specialist.rating !== null && (
            <span className="flex items-center gap-1 text-xs text-champagne">
              <Star className="w-3 h-3" />
              {specialist.rating.toFixed(1)}
              <span className="text-text-tertiary">({specialist.reviewCount})</span>
            </span>
          )}
        </div>
      )}

      {(specialist.experienceYears !== null || specialist.bio) && (
        <div className="space-y-1">
          {specialist.experienceYears !== null && (
            <p className="text-xs text-text-tertiary">
              {t('specialists.experience.label')} {specialist.experienceYears} {t('specialists.experience.years')}
            </p>
          )}
          {specialist.bio && (
            <p className="text-xs text-text-secondary line-clamp-2">{specialist.bio}</p>
          )}
        </div>
      )}
      <Link
        href={`/specialists/${specialist.id}`}
        className="block text-center py-1.5 rounded-lg border border-border-luxury text-xs text-text-tertiary hover:text-champagne hover:border-champagne/40 transition-colors mt-1"
      >
        {t('specialists.profile')} →
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpecialistsPage() {
  const { t } = useLanguage();

  const STATUS_LABEL: Record<string, string> = {
    ACTIVE:      t('specialists.status.active'),
    ON_VACATION: t('specialists.status.vacation'),
    INACTIVE:    t('specialists.status.inactive'),
    TERMINATED:  t('specialists.status.dismissed'),
  };

  const STATUS_FILTERS = [
    { value: '',       label: t('specialists.filter.all') },
    { value: 'ACTIVE', label: t('specialists.filter.active') },
    { value: 'INACTIVE', label: t('specialists.filter.inactive') },
  ];

  const DEPT_FILTERS: { value: SpecialistDepartment | ''; label: string }[] = [
    { value: '',            label: 'All departments' },
    { value: 'COSMETOLOGY', label: 'Cosmetology' },
    { value: 'MASSAGE',     label: 'Massage' },
    { value: 'RECEPTION',   label: 'Reception' },
    { value: 'MANAGEMENT',  label: 'Management' },
  ];

  const [specialists, setSpecialists] = React.useState<Specialist[]>([]);
  const [total,        setTotal]       = React.useState(0);
  const [loading,      setLoading]     = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('ACTIVE');
  const [deptFilter,   setDeptFilter]  = React.useState<SpecialistDepartment | ''>('');
  const [showModal,    setShowModal]   = React.useState(false);
  const [submitting,   setSubmitting]  = React.useState(false);
  const [error,        setError]       = React.useState('');

  const [form, setForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    department: 'COSMETOLOGY' as SpecialistDepartment,
    specialization: '',
    bio: '',
    experienceYears: '',
    color: '#C9A96E',
  });

  const fetchSpecialists = React.useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: '100' });
      if (statusFilter) q.set('status', statusFilter);
      if (deptFilter)   q.set('department', deptFilter);
      const res  = await fetch(`/api/specialists?${q}`);
      const json = await res.json() as { success: boolean; data: { items: Specialist[]; total: number } };
      if (json.success) {
        setSpecialists(json.data.items);
        setTotal(json.data.total);
      }
    } catch { /* network error */ }
    finally { setLoading(false); }
  }, [statusFilter, deptFilter]);

  React.useEffect(() => { fetchSpecialists(); }, [fetchSpecialists]);

  const handleStatusChange = (id: string, status: string) => {
    setSpecialists((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    fetchSpecialists();
  };

  const handleDeptChange = (id: string, dept: SpecialistDepartment) => {
    setSpecialists((prev) => prev.map((s) => s.id === id ? { ...s, department: dept } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res  = await fetch('/api/specialists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName:      form.firstName.trim(),
          lastName:       form.lastName.trim(),
          email:          form.email.trim(),
          department:     form.department,
          specialization: form.specialization.trim() || undefined,
          bio:            form.bio.trim() || undefined,
          experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
          color:          form.color || undefined,
        }),
      });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) { setError(json.error?.message ?? t('specialists.error.create')); return; }
      setShowModal(false);
      setForm({ firstName: '', lastName: '', email: '', department: 'COSMETOLOGY', specialization: '', bio: '', experienceYears: '', color: '#C9A96E' });
      fetchSpecialists();
    } catch {
      setError(t('specialists.error.network'));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">{t('specialists.title')}</h2>
          <p className="text-text-secondary mt-1 text-sm">
            {loading ? t('specialists.loading') : `${total} ${t('specialists.count')}`}
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          {t('specialists.add')}
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-sm transition-colors',
                statusFilter === f.value
                  ? 'bg-champagne text-obsidian font-medium'
                  : 'bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {/* Department filter */}
        <div className="flex gap-2 flex-wrap">
          {DEPT_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setDeptFilter(f.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-sm transition-colors',
                deptFilter === f.value
                  ? 'bg-zinc-700 text-zinc-100 font-medium'
                  : 'bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" />
        </div>
      ) : specialists.length === 0 ? (
        <div className="bg-onyx border border-border-luxury rounded-2xl flex flex-col items-center justify-center py-24 gap-4">
          <Sparkles className="w-12 h-12 text-text-tertiary" />
          <p className="text-text-secondary text-sm">{t('specialists.empty')}</p>
          <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
            {t('specialists.add')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {specialists.map((s) => (
            <SpecialistCard
              key={s.id}
              specialist={s}
              statusLabel={STATUS_LABEL[s.status] ?? s.status}
              t={t}
              onStatusChange={handleStatusChange}
              onDeptChange={handleDeptChange}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-onyx border border-border-luxury rounded-2xl w-full max-w-lg shadow-luxury-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
              <h3 className="font-serif text-lg font-medium text-text-primary">{t('specialists.new')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{t('specialists.form.firstName')}</span>
                  <input required {...field('firstName')} placeholder={t('specialists.form.firstNamePlaceholder')} className={inputCls} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{t('specialists.form.lastName')}</span>
                  <input required {...field('lastName')} placeholder={t('specialists.form.lastNamePlaceholder')} className={inputCls} />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{t('specialists.form.email')}</span>
                <input required type="email" {...field('email')} placeholder={t('specialists.form.emailPlaceholder')} className={inputCls} />
              </label>

              {/* Department — required, prominent */}
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Department *</span>
                <DeptSelect value={form.department} onChange={(v) => setForm((f) => ({ ...f, department: v }))} />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{t('specialists.form.specialization')}</span>
                <input {...field('specialization')} placeholder={t('specialists.form.specializationPlaceholder')} className={inputCls} />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{t('specialists.form.bio')}</span>
                <textarea {...field('bio')} rows={3} placeholder={t('specialists.form.bioPlaceholder')} className={cn(inputCls, 'resize-none')} />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{t('specialists.form.experience')}</span>
                <input type="number" min="0" max="50" {...field('experienceYears')} placeholder="5" className={inputCls} />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{t('specialists.form.color')}</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-border-luxury bg-obsidian cursor-pointer p-0.5"
                  />
                  <span className="text-sm text-text-tertiary font-mono">{form.color}</span>
                </div>
              </label>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={submitting}>
                  {submitting ? t('specialists.form.creating') : t('specialists.form.create')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
