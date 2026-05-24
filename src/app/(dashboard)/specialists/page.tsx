'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Sparkles, Plus, X, Star, MoreVertical, Power, RotateCcw, Pencil,
  ChevronDown, Lock, User, Briefcase, Wrench, Clock, Target, StickyNote,
} from 'lucide-react';
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

const DEPT_STYLE: Record<SpecialistDepartment, string> = {
  COSMETOLOGY: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  MASSAGE:     'bg-amber-500/10  text-amber-300  border-amber-500/20',
  RECEPTION:   'bg-sky-500/10    text-sky-300    border-sky-500/20',
  MANAGEMENT:  'bg-rose-500/10   text-rose-300   border-rose-500/20',
};

const DEPT_LABEL: Record<SpecialistDepartment, string> = {
  COSMETOLOGY: 'Косметология',
  MASSAGE:     'Массаж',
  RECEPTION:   'Ресепшн',
  MANAGEMENT:  'Управление',
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
const labelCls  = 'block space-y-1.5';
const labelText = 'text-xs font-medium text-text-secondary uppercase tracking-wider';

const DEPARTMENTS: SpecialistDepartment[] = ['COSMETOLOGY', 'MASSAGE', 'RECEPTION', 'MANAGEMENT'];

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  confidential,
  collapsible,
  open,
  onToggle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  confidential?: boolean;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-3 border-b border-border-luxury',
        collapsible && 'cursor-pointer select-none',
        confidential && 'border-amber-500/20',
      )}
      onClick={collapsible ? onToggle : undefined}
    >
      <div className={cn('p-1.5 rounded-lg', confidential ? 'bg-amber-500/10' : 'bg-champagne/10')}>
        <Icon className={cn('w-4 h-4', confidential ? 'text-amber-400' : 'text-champagne')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', confidential ? 'text-amber-300' : 'text-text-primary')}>{title}</p>
        {subtitle && <p className="text-[11px] text-text-tertiary mt-0.5">{subtitle}</p>}
      </div>
      {collapsible && (
        <ChevronDown className={cn('w-4 h-4 text-text-tertiary transition-transform', open && 'rotate-180')} />
      )}
    </div>
  );
}

// ─── Specialist card ───────────────────────────────────────────────────────────

function SpecialistCard({
  specialist, statusLabel, t, onStatusChange, onDeptChange,
}: {
  specialist: Specialist;
  statusLabel: string;
  t: (key: string) => string;
  onStatusChange: (id: string, status: string) => void;
  onDeptChange: (id: string, dept: SpecialistDepartment) => void;
}) {
  const [menuOpen,  setMenuOpen]  = React.useState(false);
  const [updating,  setUpdating]  = React.useState(false);
  const [editDept,  setEditDept]  = React.useState(false);
  const [deptVal,   setDeptVal]   = React.useState<SpecialistDepartment>(specialist.department);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const setStatus = async (status: string) => {
    setMenuOpen(false); setUpdating(true);
    try {
      const res = await fetch(`/api/specialists/${specialist.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const json = await res.json() as { success: boolean };
      if (json.success) onStatusChange(specialist.id, status);
    } finally { setUpdating(false); }
  };

  const saveDept = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/specialists/${specialist.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ department: deptVal }) });
      const json = await res.json() as { success: boolean };
      if (json.success) { onDeptChange(specialist.id, deptVal); setEditDept(false); }
    } finally { setUpdating(false); }
  };

  const isActive = specialist.status === 'ACTIVE';

  return (
    <div className={cn('bg-onyx border rounded-2xl p-5 flex flex-col gap-3 transition-all', isActive ? 'border-border-luxury hover:border-champagne/30' : 'border-border-luxury opacity-60')}>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar name={`${specialist.firstName} ${specialist.lastName}`} size="md" />
          {specialist.color && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-onyx" style={{ backgroundColor: specialist.color }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary leading-tight">{specialist.firstName} {specialist.lastName}</p>
          {specialist.specialization && <p className="text-xs text-text-secondary mt-0.5 truncate">{specialist.specialization}</p>}
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen((o) => !o)} disabled={updating} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
            {updating ? <div className="w-4 h-4 border-2 border-champagne/30 border-t-champagne rounded-full animate-spin" /> : <MoreVertical className="w-4 h-4" />}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 bg-onyx border border-border-luxury rounded-xl shadow-luxury-lg min-w-48 py-1 animate-slide-down">
              <button onClick={() => { setMenuOpen(false); setEditDept(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-charcoal hover:text-text-primary transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Изменить отдел
              </button>
              <div className="border-t border-border-luxury my-1" />
              {isActive
                ? <button onClick={() => setStatus('INACTIVE')} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"><Power className="w-4 h-4" />{t('specialists.deactivate')}</button>
                : <button onClick={() => setStatus('ACTIVE')} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-charcoal hover:text-text-primary transition-colors"><RotateCcw className="w-4 h-4" />{t('specialists.restore')}</button>}
            </div>
          )}
        </div>
      </div>

      {editDept ? (
        <div className="flex items-center gap-2">
          <select value={deptVal} onChange={(e) => setDeptVal(e.target.value as SpecialistDepartment)} className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-obsidian border border-border-luxury text-text-primary focus:outline-none focus:border-champagne/40">
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}
          </select>
          <button onClick={saveDept} disabled={updating} className="px-2.5 py-1.5 rounded-lg bg-champagne text-obsidian text-xs font-medium hover:bg-champagne/90 transition-colors disabled:opacity-50">Сохранить</button>
          <button onClick={() => { setEditDept(false); setDeptVal(specialist.department); }} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <DeptBadge dept={specialist.department} />
          <Badge variant={isActive ? 'success' : 'default'} dot>{statusLabel}</Badge>
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
          {specialist.experienceYears !== null && <p className="text-xs text-text-tertiary">{t('specialists.experience.label')} {specialist.experienceYears} {t('specialists.experience.years')}</p>}
          {specialist.bio && <p className="text-xs text-text-secondary line-clamp-2">{specialist.bio}</p>}
        </div>
      )}
      <Link href={`/specialists/${specialist.id}`} className="block text-center py-1.5 rounded-lg border border-border-luxury text-xs text-text-tertiary hover:text-champagne hover:border-champagne/40 transition-colors mt-1">
        {t('specialists.profile')} →
      </Link>
    </div>
  );
}

// ─── Create form (grouped sections) ────────────────────────────────────────────

const EMPTY_FORM = {
  // Identity
  firstName: '', lastName: '', email: '', displayName: '',
  phone: '', whatsapp: '', telegramHandle: '', languagePreference: 'ru' as 'ru' | 'en',
  // Employment
  department: 'COSMETOLOGY' as SpecialistDepartment,
  employmentType: 'STAFF' as 'STAFF' | 'CONTRACTOR',
  specialization: '', bio: '', experienceYears: '',
  color: '#C9A96E', hireDate: '',
  // Compensation
  rateType: 'per_service' as 'hourly' | 'per_service' | 'fixed',
  baseRate: '', commissionPercent: '', paymentMethod: '',
  // Capabilities
  maxClientsPerDay: '', vipPermission: false,
  // Massage targets
  dailyTargetSessions: '6', workloadAlertThreshold: '4', autoScheduleEligible: true,
  // Notes
  internalNotes: '',
  // Admin toggle
  showEarningsToSpecialist: false,
};

type FormState = typeof EMPTY_FORM;

export default function SpecialistsPage() {
  const { t } = useLanguage();

  const STATUS_LABEL: Record<string, string> = {
    ACTIVE: t('specialists.status.active'), ON_VACATION: t('specialists.status.vacation'),
    INACTIVE: t('specialists.status.inactive'), TERMINATED: t('specialists.status.dismissed'),
  };
  const STATUS_FILTERS = [
    { value: '', label: t('specialists.filter.all') },
    { value: 'ACTIVE', label: t('specialists.filter.active') },
    { value: 'INACTIVE', label: t('specialists.filter.inactive') },
  ];
  const DEPT_FILTERS: { value: SpecialistDepartment | ''; label: string }[] = [
    { value: '', label: 'Все отделы' },
    { value: 'COSMETOLOGY', label: 'Косметология' },
    { value: 'MASSAGE', label: 'Массаж' },
    { value: 'RECEPTION', label: 'Ресепшн' },
    { value: 'MANAGEMENT', label: 'Управление' },
  ];

  const [specialists,  setSpecialists]  = React.useState<Specialist[]>([]);
  const [total,        setTotal]        = React.useState(0);
  const [loading,      setLoading]      = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('ACTIVE');
  const [deptFilter,   setDeptFilter]   = React.useState<SpecialistDepartment | ''>('');
  const [showModal,    setShowModal]    = React.useState(false);
  const [submitting,   setSubmitting]   = React.useState(false);
  const [error,        setError]        = React.useState('');
  const [compOpen,     setCompOpen]     = React.useState(false);
  const [massageOpen,  setMassageOpen]  = React.useState(false);
  const [form,         setForm]         = React.useState<FormState>(EMPTY_FORM);

  const fetchSpecialists = React.useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: '100' });
      if (statusFilter) q.set('status', statusFilter);
      if (deptFilter)   q.set('department', deptFilter);
      const res  = await fetch(`/api/specialists?${q}`);
      const json = await res.json() as { success: boolean; data: { items: Specialist[]; total: number } };
      if (json.success) { setSpecialists(json.data.items); setTotal(json.data.total); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [statusFilter, deptFilter]);

  React.useEffect(() => { fetchSpecialists(); }, [fetchSpecialists]);

  const set = (k: keyof FormState, v: FormState[typeof k]) => setForm((f) => ({ ...f, [k]: v }));
  const inp = (k: keyof FormState) => ({
    value: form[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const payload = {
        firstName:      form.firstName.trim(),
        lastName:       form.lastName.trim(),
        email:          form.email.trim(),
        department:     form.department,
        displayName:    form.displayName.trim() || undefined,
        phone:          form.phone.trim() || undefined,
        whatsapp:       form.whatsapp.trim() || undefined,
        telegramHandle: form.telegramHandle.trim() || undefined,
        languagePreference: form.languagePreference,
        employmentType: form.employmentType,
        specialization: form.specialization.trim() || undefined,
        bio:            form.bio.trim() || undefined,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
        color:          form.color || undefined,
        hiredAt:        form.hireDate || undefined,
        maxClientsPerDay: form.maxClientsPerDay ? Number(form.maxClientsPerDay) : undefined,
        vipPermission:  form.vipPermission,
        dailyTargetSessions: Number(form.dailyTargetSessions) || 6,
        workloadAlertThreshold: Number(form.workloadAlertThreshold) || 4,
        autoScheduleEligible: form.autoScheduleEligible,
        showEarningsToSpecialist: form.showEarningsToSpecialist,
        internalNotes:  form.internalNotes.trim() || undefined,
        commissionRate: form.commissionPercent ? Number(form.commissionPercent) / 100 : undefined,
      };
      const res  = await fetch('/api/specialists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json() as { success: boolean; error?: { message: string } };
      if (!json.success) { setError(json.error?.message ?? t('specialists.error.create')); return; }
      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchSpecialists();
    } catch { setError(t('specialists.error.network')); }
    finally { setSubmitting(false); }
  };

  const isMassage = form.department === 'MASSAGE';

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-3xl font-medium text-text-primary tracking-tight">{t('specialists.title')}</h2>
          <p className="text-text-secondary mt-1 text-sm">{loading ? t('specialists.loading') : `${total} ${t('specialists.count')}`}</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          {t('specialists.add')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={cn('px-3.5 py-1.5 rounded-xl text-sm transition-colors', statusFilter === f.value ? 'bg-champagne text-obsidian font-medium' : 'bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal')}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {DEPT_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setDeptFilter(f.value)}
              className={cn('px-3.5 py-1.5 rounded-xl text-sm transition-colors', deptFilter === f.value ? 'bg-zinc-700 text-zinc-100 font-medium' : 'bg-onyx border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal')}>
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
          <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>{t('specialists.add')}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {specialists.map((s) => (
            <SpecialistCard key={s.id} specialist={s} statusLabel={STATUS_LABEL[s.status] ?? s.status} t={t}
              onStatusChange={(id, status) => { setSpecialists((p) => p.map((x) => x.id === id ? { ...x, status } : x)); fetchSpecialists(); }}
              onDeptChange={(id, dept) => setSpecialists((p) => p.map((x) => x.id === id ? { ...x, department: dept } : x))} />
          ))}
        </div>
      )}

      {/* Create modal — grouped sections */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-onyx border border-border-luxury rounded-2xl w-full max-w-2xl shadow-luxury-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury sticky top-0 bg-onyx z-10">
              <h3 className="font-serif text-lg font-medium text-text-primary">{t('specialists.new')}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">

              {/* ── 1. Identity ── */}
              <div className="space-y-4">
                <SectionHeader icon={User} title="Личные данные" subtitle="Контактная информация и настройки языка" />
                <div className="grid grid-cols-2 gap-4">
                  <label className={labelCls}><span className={labelText}>Имя *</span><input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={inputCls} placeholder="Олеся" /></label>
                  <label className={labelCls}><span className={labelText}>Фамилия *</span><input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputCls} placeholder="Хвесько" /></label>
                </div>
                <label className={labelCls}><span className={labelText}>Email *</span><input required type="email" {...inp('email')} className={inputCls} placeholder="specialist@shantelyur.ru" /></label>
                <label className={labelCls}><span className={labelText}>Имя для клиентов</span><input {...inp('displayName')} className={inputCls} placeholder="Видно в записях и уведомлениях" /></label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={labelCls}><span className={labelText}>Телефон</span><input {...inp('phone')} className={inputCls} placeholder="+7 900 000 0000" /></label>
                  <label className={labelCls}><span className={labelText}>WhatsApp</span><input {...inp('whatsapp')} className={inputCls} placeholder="+7 900 000 0000" /></label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className={labelCls}><span className={labelText}>Telegram</span><input {...inp('telegramHandle')} className={inputCls} placeholder="@username" /></label>
                  <label className={labelCls}>
                    <span className={labelText}>Язык уведомлений</span>
                    <select value={form.languagePreference} onChange={(e) => set('languagePreference', e.target.value as 'ru' | 'en')} className={selectCls}>
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* ── 2. Employment ── */}
              <div className="space-y-4">
                <SectionHeader icon={Briefcase} title="Трудоустройство" subtitle="Отдел, должность и тип занятости" />
                <div className="grid grid-cols-2 gap-4">
                  <label className={labelCls}>
                    <span className={labelText}>Отдел *</span>
                    <select value={form.department} onChange={(e) => set('department', e.target.value as SpecialistDepartment)} className={selectCls}>
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}
                    </select>
                  </label>
                  <label className={labelCls}>
                    <span className={labelText}>Тип занятости</span>
                    <select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value as 'STAFF' | 'CONTRACTOR')} className={selectCls}>
                      <option value="STAFF">Штатный сотрудник</option>
                      <option value="CONTRACTOR">Внешний подрядчик</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className={labelCls}><span className={labelText}>Специализация</span><input {...inp('specialization')} className={inputCls} placeholder="Косметология, уход" /></label>
                  <label className={labelCls}><span className={labelText}>Дата приёма</span><input type="date" {...inp('hireDate')} className={inputCls} /></label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className={labelCls}><span className={labelText}>Опыт (лет)</span><input type="number" min="0" max="50" {...inp('experienceYears')} className={inputCls} placeholder="5" /></label>
                  <label className={labelCls}>
                    <span className={labelText}>Цвет в расписании</span>
                    <div className="flex items-center gap-3">
                      <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} className="w-10 h-10 rounded-lg border border-border-luxury bg-obsidian cursor-pointer p-0.5" />
                      <span className="text-sm text-text-tertiary font-mono">{form.color}</span>
                    </div>
                  </label>
                </div>
                <label className={labelCls}><span className={labelText}>О специалисте</span><textarea {...inp('bio')} rows={3} className={cn(inputCls, 'resize-none')} placeholder="Краткое описание для клиентов" /></label>
              </div>

              {/* ── 3. Compensation (collapsible, confidential) ── */}
              <div className="space-y-4">
                <SectionHeader icon={Lock} title="Компенсация" subtitle="Конфиденциально — не видно специалисту" confidential collapsible open={compOpen} onToggle={() => setCompOpen((o) => !o)} />
                {compOpen && (
                  <div className="space-y-4 pt-2 border border-amber-500/10 rounded-xl p-4 bg-amber-500/5">
                    <div className="grid grid-cols-3 gap-3">
                      <label className={labelCls}>
                        <span className={labelText}>Тип ставки</span>
                        <select value={form.rateType} onChange={(e) => set('rateType', e.target.value as 'hourly' | 'per_service' | 'fixed')} className={selectCls}>
                          <option value="per_service">За процедуру</option>
                          <option value="hourly">Почасовая</option>
                          <option value="fixed">Оклад</option>
                        </select>
                      </label>
                      <label className={labelCls}><span className={labelText}>Базовая ставка (₽)</span><input type="number" {...inp('baseRate')} className={inputCls} placeholder="0" /></label>
                      <label className={labelCls}><span className={labelText}>Комиссия (%)</span><input type="number" min="0" max="100" {...inp('commissionPercent')} className={inputCls} placeholder="30" /></label>
                    </div>
                    <label className={labelCls}><span className={labelText}>Способ выплаты</span><input {...inp('paymentMethod')} className={inputCls} placeholder="Наличные, перевод..." /></label>
                    <div className="flex items-center gap-3 pt-1">
                      <input type="checkbox" id="showEarnings" checked={form.showEarningsToSpecialist} onChange={(e) => set('showEarningsToSpecialist', e.target.checked)} className="rounded border-border-luxury bg-obsidian accent-champagne w-4 h-4 cursor-pointer" />
                      <label htmlFor="showEarnings" className="text-sm text-text-secondary cursor-pointer">Показывать заработок специалисту в его портале</label>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 4. Capabilities ── */}
              <div className="space-y-4">
                <SectionHeader icon={Wrench} title="Возможности" subtitle="Лимиты и VIP-доступ" />
                <div className="grid grid-cols-2 gap-4">
                  <label className={labelCls}><span className={labelText}>Макс. клиентов в день</span><input type="number" min="1" {...inp('maxClientsPerDay')} className={inputCls} placeholder="Без ограничений" /></label>
                  <div className="flex items-end pb-2.5">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="vipPerm" checked={form.vipPermission} onChange={(e) => set('vipPermission', e.target.checked)} className="rounded border-border-luxury bg-obsidian accent-champagne w-4 h-4 cursor-pointer" />
                      <label htmlFor="vipPerm" className="text-sm text-text-secondary cursor-pointer">Разрешить VIP-клиентов</label>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 5. Massage targets (conditional) ── */}
              {isMassage && (
                <div className="space-y-4">
                  <SectionHeader icon={Target} title="Цели массажиста" subtitle="Нагрузка и автоматическое расписание" collapsible open={massageOpen} onToggle={() => setMassageOpen((o) => !o)} />
                  {massageOpen && (
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <label className={labelCls}><span className={labelText}>Сеансов в день (цель)</span><input type="number" min="1" max="20" {...inp('dailyTargetSessions')} className={inputCls} /></label>
                        <label className={labelCls}><span className={labelText}>Порог оповещения</span><input type="number" min="1" {...inp('workloadAlertThreshold')} className={inputCls} /></label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="autoSched" checked={form.autoScheduleEligible} onChange={(e) => set('autoScheduleEligible', e.target.checked)} className="rounded border-border-luxury bg-obsidian accent-champagne w-4 h-4 cursor-pointer" />
                        <label htmlFor="autoSched" className="text-sm text-text-secondary cursor-pointer">Включать в автоматическое распределение</label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 6. Internal notes ── */}
              <div className="space-y-4">
                <SectionHeader icon={StickyNote} title="Внутренние заметки" subtitle="Видны только администратору" />
                <textarea {...inp('internalNotes')} rows={3} className={cn(inputCls, 'resize-none')} placeholder="Примечания для внутреннего использования..." />
              </div>

              {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-onyx py-4 -mx-6 px-6 border-t border-border-luxury mt-4">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
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
