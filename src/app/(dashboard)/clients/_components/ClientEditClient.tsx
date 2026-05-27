'use client';

import * as React from 'react';
import { X, Pencil, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientEditData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  notes: string | null;
  telegramChatId: string | null;
}

interface Props {
  client: ClientEditData;
}

const inputCls = cn(
  'w-full px-3.5 py-2.5 rounded-xl text-sm',
  'bg-obsidian border border-border-luxury',
  'text-text-primary placeholder:text-text-tertiary',
  'focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40',
  'transition-all',
);

export function ClientEditClient({ client }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const [form, setForm] = React.useState({
    firstName:      client.firstName,
    lastName:       client.lastName,
    email:          client.email,
    phone:          client.phone ?? '',
    notes:          client.notes ?? '',
    telegramChatId: client.telegramChatId ?? '',
  });

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName:      form.firstName.trim(),
          lastName:       form.lastName.trim(),
          email:          form.email.trim() || undefined,
          phone:          form.phone.trim() || undefined,
          notes:          form.notes.trim() || undefined,
          telegramChatId: form.telegramChatId.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? 'Save error');
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        window.location.reload();
      }, 800);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-border-luxury text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-onyx border border-border-luxury rounded-2xl w-full max-w-lg shadow-luxury-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-luxury">
              <h3 className="font-serif text-lg font-medium text-text-primary">Edit Client</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-charcoal transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">First Name *</span>
                  <input value={form.firstName} onChange={set('firstName')} required className={inputCls} placeholder="First name" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Last Name *</span>
                  <input value={form.lastName} onChange={set('lastName')} required className={inputCls} placeholder="Last name" />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Email</span>
                <input type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="email@example.com" />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Phone</span>
                <input value={form.phone} onChange={set('phone')} className={inputCls} placeholder="+7 900 000-00-00" />
              </label>

              {/* Telegram */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Telegram</span>
                </div>
                <label className="block space-y-1.5">
                  <span className="text-xs text-text-tertiary">Chat ID</span>
                  <input
                    value={form.telegramChatId}
                    onChange={set('telegramChatId')}
                    className={inputCls}
                    placeholder="e.g. 123456789"
                  />
                </label>
                <p className="text-xs text-text-tertiary leading-relaxed">
                  The client must send <span className="text-blue-400 font-medium">/start</span> to your bot first.
                  They can get their ID by messaging{' '}
                  <span className="text-blue-400 font-medium">@userinfobot</span> in Telegram.
                  Once set, booking confirmations and reminders will be sent automatically.
                </p>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={set('notes')}
                  rows={3}
                  className={cn(inputCls, 'resize-none')}
                  placeholder="Special requests, preferences..."
                />
              </label>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
              {success && (
                <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">Saved successfully</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border-luxury text-sm text-text-secondary hover:text-text-primary hover:bg-charcoal transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-champagne text-obsidian text-sm font-medium hover:bg-champagne-light transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
