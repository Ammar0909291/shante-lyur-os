'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/language';

function ResetPasswordForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError(t('auth.passwordMin8')); return; }
    if (password !== confirm) { setError(t('auth.passwordMismatch')); return; }
    if (!token) { setError(t('auth.invalidResetLink')); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? t('auth.resetError')); return; }
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setError(t('auth.networkError'));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="animate-slide-up text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-medium text-text-primary">{t('auth.invalidLinkTitle')}</h2>
        <p className="text-sm text-text-secondary mt-2 mb-6">{t('auth.invalidLinkDesc')}</p>
        <Link href="/forgot-password" className="text-sm text-champagne hover:underline">
          {t('auth.requestNewLink')}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="animate-slide-up text-center">
        <CheckCircle className="w-12 h-12 text-champagne mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-medium text-text-primary">{t('auth.passwordChanged')}</h2>
        <p className="text-sm text-text-secondary mt-2">{t('auth.redirecting')}</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">
          {t('auth.newPassword')}
        </h2>
        <p className="text-sm text-text-secondary mt-1.5">{t('auth.newPasswordSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label={t('auth.newPasswordLabel')}
          name="password"
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          placeholder={t('auth.passwordMin8hint')}
          autoFocus
          disabled={loading}
        />
        <Input
          label={t('auth.confirmPasswordLabel')}
          name="confirm"
          type="password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(''); }}
          placeholder={t('auth.repeatPassword')}
          error={error}
          disabled={loading}
        />
        <Button type="submit" variant="primary" fullWidth loading={loading}>
          {t('auth.savePassword')}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  return (
    <React.Suspense fallback={<div className="animate-pulse text-text-tertiary text-sm">{t('common.loading')}</div>}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
