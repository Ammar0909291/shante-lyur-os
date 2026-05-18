'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  FileText,
  History,
  User,
  Phone,
  Mail,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface ClientProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  skinType?: string;
  hairType?: string;
  notes?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt?: string;
}

interface AllergyData {
  id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction?: string | null;
  diagnosedAt?: string | null;
}

interface RestrictionData {
  id: string;
  type: 'medical' | 'pregnancy' | 'medication' | 'other';
  description: string;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
}

interface NoteData {
  id: string;
  specialistId: string;
  noteType: string;
  content: string;
  privacy: string;
  createdAt: string;
}

interface ProcedureData {
  id: string;
  serviceId: string;
  specialistId: string;
  performedAt: string;
  results?: string | null;
  sideEffects?: string | null;
  clientFeedback?: string | null;
  followUpRequired: boolean;
  followUpDate?: string | null;
}

type Tab = 'profile' | 'health' | 'procedures' | 'notes';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const severityLabel: Record<string, string> = { mild: 'Лёгкая', moderate: 'Средняя', severe: 'Тяжёлая' };
const severityVariant: Record<string, 'default' | 'warning' | 'error'> = { mild: 'default', moderate: 'warning', severe: 'error' };

const restrictionTypeLabel: Record<string, string> = {
  medical: 'Медицинское', pregnancy: 'Беременность', medication: 'Медикаменты', other: 'Прочее',
};

const noteTypeLabel: Record<string, string> = {
  consultation: 'Консультация', procedure: 'Процедура', followup: 'Повторный визит',
  general: 'Общее', complaint: 'Жалоба',
};

// ── Add Allergy Modal ─────────────────────────────────────────────────────────

function AddAllergyModal({ profileId, onSaved, onClose }: { profileId: string; onSaved: () => void; onClose: () => void }) {
  const [allergen, setAllergen] = React.useState('');
  const [severity, setSeverity] = React.useState<'mild' | 'moderate' | 'severe'>('mild');
  const [reaction, setReaction] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  const submit = async () => {
    if (!allergen.trim()) { setErr('Укажите аллерген'); return; }
    setSaving(true);
    setErr('');
    try {
      const res = await fetch(`/api/customers/${profileId}/allergies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergen: allergen.trim(), severity, reaction: reaction.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-medium text-text-primary">Добавить аллергию</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Аллерген *</label>
            <input
              value={allergen}
              onChange={e => setAllergen(e.target.value)}
              placeholder="Напр: латекс, лидокаин, ретинол..."
              className="w-full px-3 py-2 rounded-xl text-sm bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-champagne/40"
            />
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Тяжесть</label>
            <div className="relative">
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as typeof severity)}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-xl text-sm bg-charcoal border border-border-luxury text-text-primary focus:outline-none focus:ring-2 focus:ring-champagne/40"
              >
                <option value="mild">Лёгкая</option>
                <option value="moderate">Средняя</option>
                <option value="severe">Тяжёлая</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Реакция (необязательно)</label>
            <textarea
              value={reaction}
              onChange={e => setReaction(e.target.value)}
              rows={2}
              placeholder="Описание реакции..."
              className="w-full px-3 py-2 rounded-xl text-sm bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-champagne/40 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Отмена</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Add Restriction Modal ─────────────────────────────────────────────────────

function AddRestrictionModal({ profileId, onSaved, onClose }: { profileId: string; onSaved: () => void; onClose: () => void }) {
  const [type, setType] = React.useState<RestrictionData['type']>('medical');
  const [description, setDescription] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  const submit = async () => {
    if (!description.trim()) { setErr('Укажите описание'); return; }
    setSaving(true);
    setErr('');
    try {
      const res = await fetch(`/api/customers/${profileId}/restrictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description: description.trim(), isActive: true }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-medium text-text-primary">Добавить противопоказание</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Тип</label>
            <div className="relative">
              <select
                value={type}
                onChange={e => setType(e.target.value as typeof type)}
                className="w-full appearance-none px-3 py-2 pr-8 rounded-xl text-sm bg-charcoal border border-border-luxury text-text-primary focus:outline-none focus:ring-2 focus:ring-champagne/40"
              >
                <option value="medical">Медицинское</option>
                <option value="pregnancy">Беременность</option>
                <option value="medication">Медикаменты</option>
                <option value="other">Прочее</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Описание *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Описание противопоказания..."
              className="w-full px-3 py-2 rounded-xl text-sm bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-champagne/40 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Отмена</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Add Note Modal ────────────────────────────────────────────────────────────

function AddNoteModal({ profileId, onSaved, onClose }: { profileId: string; onSaved: () => void; onClose: () => void }) {
  const [noteType, setNoteType] = React.useState('general');
  const [content, setContent] = React.useState('');
  const [privacy, setPrivacy] = React.useState<'PRIVATE' | 'SHARED' | 'ADMIN_ONLY'>('PRIVATE');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  const submit = async () => {
    if (!content.trim()) { setErr('Укажите текст заметки'); return; }
    setSaving(true);
    setErr('');
    try {
      const res = await fetch(`/api/customers/${profileId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteType, content: content.trim(), privacy }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-onyx border border-border-luxury rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-medium text-text-primary">Новая заметка специалиста</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {err && <p className="text-xs text-red-400">{err}</p>}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Тип</label>
              <div className="relative">
                <select
                  value={noteType}
                  onChange={e => setNoteType(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-xl text-sm bg-charcoal border border-border-luxury text-text-primary focus:outline-none focus:ring-2 focus:ring-champagne/40"
                >
                  <option value="consultation">Консультация</option>
                  <option value="procedure">Процедура</option>
                  <option value="followup">Повторный визит</option>
                  <option value="general">Общее</option>
                  <option value="complaint">Жалоба</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Доступ</label>
              <div className="relative">
                <select
                  value={privacy}
                  onChange={e => setPrivacy(e.target.value as typeof privacy)}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-xl text-sm bg-charcoal border border-border-luxury text-text-primary focus:outline-none focus:ring-2 focus:ring-champagne/40"
                >
                  <option value="PRIVATE">Только я</option>
                  <option value="SHARED">Все специалисты</option>
                  <option value="ADMIN_ONLY">Только администратор</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-tertiary mb-1">Заметка *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              placeholder="Введите заметку..."
              className="w-full px-3 py-2 rounded-xl text-sm bg-charcoal border border-border-luxury text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-champagne/40 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Отмена</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const profileId = params.id as string;

  const [profile, setProfile] = React.useState<ClientProfile | null>(null);
  const [allergies, setAllergies] = React.useState<AllergyData[]>([]);
  const [restrictions, setRestrictions] = React.useState<RestrictionData[]>([]);
  const [notes, setNotes] = React.useState<NoteData[]>([]);
  const [procedures, setProcedures] = React.useState<ProcedureData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<Tab>('profile');

  const [showAddAllergy, setShowAddAllergy] = React.useState(false);
  const [showAddRestriction, setShowAddRestriction] = React.useState(false);
  const [showAddNote, setShowAddNote] = React.useState(false);

  const loadProfile = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${profileId}`);
      const json = await res.json() as { success: boolean; data: { profile: ClientProfile } };
      if (!json.success) throw new Error('Клиент не найден');
      setProfile(json.data.profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    }
  }, [profileId]);

  const loadCrmData = React.useCallback(async () => {
    const [allergyRes, restrictionRes, noteRes, procedureRes] = await Promise.allSettled([
      fetch(`/api/customers/${profileId}/allergies`).then(r => r.json()) as Promise<{ data: AllergyData[] }>,
      fetch(`/api/customers/${profileId}/restrictions`).then(r => r.json()) as Promise<{ data: RestrictionData[] }>,
      fetch(`/api/customers/${profileId}/notes`).then(r => r.json()) as Promise<{ data: NoteData[] }>,
      fetch(`/api/customers/${profileId}/procedures`).then(r => r.json()) as Promise<{ data: ProcedureData[] }>,
    ]);
    if (allergyRes.status === 'fulfilled') setAllergies(allergyRes.value.data ?? []);
    if (restrictionRes.status === 'fulfilled') setRestrictions(restrictionRes.value.data ?? []);
    if (noteRes.status === 'fulfilled') setNotes(noteRes.value.data ?? []);
    if (procedureRes.status === 'fulfilled') setProcedures(procedureRes.value.data ?? []);
  }, [profileId]);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([loadProfile(), loadCrmData()]).finally(() => setLoading(false));
  }, [loadProfile, loadCrmData]);

  const reloadAllergies = async () => {
    const r = await fetch(`/api/customers/${profileId}/allergies`);
    const j = await r.json() as { data: AllergyData[] };
    setAllergies(j.data ?? []);
  };
  const reloadRestrictions = async () => {
    const r = await fetch(`/api/customers/${profileId}/restrictions`);
    const j = await r.json() as { data: RestrictionData[] };
    setRestrictions(j.data ?? []);
  };
  const reloadNotes = async () => {
    const r = await fetch(`/api/customers/${profileId}/notes`);
    const j = await r.json() as { data: NoteData[] };
    setNotes(j.data ?? []);
  };

  const activeRestrictions = restrictions.filter(r => r.isActive);
  const hasCriticalInfo = allergies.some(a => a.severity === 'severe') || activeRestrictions.length > 0;

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'profile', label: 'Профиль', icon: User },
    { id: 'health', label: 'Здоровье', icon: ShieldAlert, count: allergies.length + activeRestrictions.length },
    { id: 'procedures', label: 'История процедур', icon: History, count: procedures.length },
    { id: 'notes', label: 'Заметки', icon: FileText, count: notes.length },
  ];

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center text-text-tertiary text-sm py-20">Загрузка...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">{error ?? 'Клиент не найден'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* Back link */}
      <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-text-tertiary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Клиенты
      </Link>

      {/* Profile header */}
      <div className="bg-onyx border border-border-luxury rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Avatar name={`${profile.firstName} ${profile.lastName}`} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-2xl font-medium text-text-primary">
                {profile.firstName} {profile.lastName}
              </h2>
              {hasCriticalInfo && (
                <Badge variant="error" dot>Противопоказания</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-text-secondary">
              {profile.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                  {profile.phone}
                </span>
              )}
              {profile.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-text-tertiary" />
                  {profile.email}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-6 mt-4">
              <div>
                <p className="text-xs text-text-tertiary">Визитов</p>
                <p className="font-semibold text-text-primary">{profile.totalVisits}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Всего потрачено</p>
                <p className="font-semibold text-champagne">{formatCurrency(profile.totalSpent)}</p>
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Последний визит</p>
                <p className="font-semibold text-text-primary">{fmtDate(profile.lastVisitAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical allergy/restriction banner */}
      {hasCriticalInfo && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-950/40 border border-red-800/50 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-300 space-y-1">
            {allergies.filter(a => a.severity === 'severe').map(a => (
              <p key={a.id}>Аллергия: <strong>{a.allergen}</strong> — тяжёлая реакция</p>
            ))}
            {activeRestrictions.map(r => (
              <p key={r.id}><strong>{restrictionTypeLabel[r.type]}:</strong> {r.description}</p>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-onyx border border-border-luxury rounded-2xl overflow-hidden">
        <div className="flex overflow-x-auto border-b border-border-luxury">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-champagne text-champagne'
                    : 'border-transparent text-text-secondary hover:text-text-primary',
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {(tab.count ?? 0) > 0 && (
                  <span className={cn(
                    'min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-semibold px-1',
                    activeTab === tab.id ? 'bg-champagne/15 text-champagne' : 'bg-charcoal text-text-tertiary',
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Profile tab */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { label: 'Тип кожи', value: profile.skinType },
                { label: 'Тип волос', value: profile.hairType },
                { label: 'Пол', value: profile.gender },
                { label: 'Дата рождения', value: fmtDate(profile.dateOfBirth) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-text-tertiary mb-1">{label}</p>
                  <p className="text-sm text-text-primary">{value ?? '—'}</p>
                </div>
              ))}
              {profile.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-text-tertiary mb-1">Заметки</p>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">{profile.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Health tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {/* Allergies */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-text-primary">Аллергии</h4>
                  <Button variant="ghost" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddAllergy(true)}>
                    Добавить
                  </Button>
                </div>
                {allergies.length === 0 ? (
                  <p className="text-sm text-text-tertiary">Аллергий не зарегистрировано</p>
                ) : (
                  <div className="space-y-2">
                    {allergies.map(a => (
                      <div key={a.id} className="flex items-start gap-3 p-3 bg-charcoal rounded-xl">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text-primary">{a.allergen}</span>
                            <Badge variant={severityVariant[a.severity]}>{severityLabel[a.severity]}</Badge>
                          </div>
                          {a.reaction && <p className="text-xs text-text-secondary mt-0.5">{a.reaction}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Restrictions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-text-primary">Противопоказания</h4>
                  <Button variant="ghost" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddRestriction(true)}>
                    Добавить
                  </Button>
                </div>
                {restrictions.length === 0 ? (
                  <p className="text-sm text-text-tertiary">Противопоказаний не зарегистрировано</p>
                ) : (
                  <div className="space-y-2">
                    {restrictions.map(r => (
                      <div key={r.id} className={cn('p-3 rounded-xl', r.isActive ? 'bg-charcoal' : 'bg-charcoal/40 opacity-60')}>
                        <div className="flex items-center gap-2">
                          <Badge variant={r.isActive ? 'warning' : 'default'}>{restrictionTypeLabel[r.type]}</Badge>
                          {!r.isActive && <span className="text-xs text-text-tertiary">Неактивно</span>}
                        </div>
                        <p className="text-sm text-text-secondary mt-1">{r.description}</p>
                        {r.validUntil && (
                          <p className="text-xs text-text-tertiary mt-0.5">До: {fmtDate(r.validUntil)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Procedures tab */}
          {activeTab === 'procedures' && (
            <div>
              {procedures.length === 0 ? (
                <p className="text-sm text-text-tertiary">История процедур пуста</p>
              ) : (
                <div className="space-y-3">
                  {procedures.map(p => (
                    <div key={p.id} className="p-4 bg-charcoal rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">{fmtDate(p.performedAt)}</span>
                        {p.followUpRequired && (
                          <Badge variant="warning">Повторный визит</Badge>
                        )}
                      </div>
                      {p.results && (
                        <div>
                          <p className="text-xs text-text-tertiary">Результат</p>
                          <p className="text-sm text-text-secondary">{p.results}</p>
                        </div>
                      )}
                      {p.sideEffects && (
                        <div>
                          <p className="text-xs text-red-400">Побочные эффекты</p>
                          <p className="text-sm text-text-secondary">{p.sideEffects}</p>
                        </div>
                      )}
                      {p.clientFeedback && (
                        <div>
                          <p className="text-xs text-text-tertiary">Отзыв клиента</p>
                          <p className="text-sm text-text-secondary italic">"{p.clientFeedback}"</p>
                        </div>
                      )}
                      {p.followUpRequired && p.followUpDate && (
                        <p className="text-xs text-champagne">Повторный визит: {fmtDate(p.followUpDate)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes tab */}
          {activeTab === 'notes' && (
            <div>
              <div className="flex justify-end mb-4">
                <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAddNote(true)}>
                  Добавить заметку
                </Button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm text-text-tertiary">Заметок нет</p>
              ) : (
                <div className="space-y-3">
                  {notes.map(n => (
                    <div key={n.id} className="p-4 bg-charcoal rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{noteTypeLabel[n.noteType] ?? n.noteType}</Badge>
                        <span className="text-xs text-text-tertiary ml-auto">{fmtDate(n.createdAt)}</span>
                      </div>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddAllergy && (
        <AddAllergyModal
          profileId={profileId}
          onSaved={() => { void reloadAllergies(); }}
          onClose={() => setShowAddAllergy(false)}
        />
      )}
      {showAddRestriction && (
        <AddRestrictionModal
          profileId={profileId}
          onSaved={() => { void reloadRestrictions(); }}
          onClose={() => setShowAddRestriction(false)}
        />
      )}
      {showAddNote && (
        <AddNoteModal
          profileId={profileId}
          onSaved={() => { void reloadNotes(); }}
          onClose={() => setShowAddNote(false)}
        />
      )}
    </div>
  );
}
