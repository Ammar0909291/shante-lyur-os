'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
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
    if (password.length < 8) { setError('Пароль должен быть не менее 8 символов'); return; }
    if (password !== confirm) { setError('Пароли не совпадают'); return; }
    if (!token) { setError('Ссылка сброса недействительна'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? 'Ошибка сброса пароля'); return; }
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setError('Ошибка соединения. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="animate-slide-up text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-medium text-text-primary">Недействительная ссылка</h2>
        <p className="text-sm text-text-secondary mt-2 mb-6">Ссылка для сброса пароля устарела или недействительна.</p>
        <Link href="/forgot-password" className="text-sm text-champagne hover:underline">
          Запросить новую ссылку
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="animate-slide-up text-center">
        <CheckCircle className="w-12 h-12 text-champagne mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-medium text-text-primary">Пароль изменён</h2>
        <p className="text-sm text-text-secondary mt-2">Перенаправляем на страницу входа...</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">
          Новый пароль
        </h2>
        <p className="text-sm text-text-secondary mt-1.5">Введите новый пароль для вашего аккаунта</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Новый пароль"
          name="password"
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          placeholder="Минимум 8 символов"
          autoFocus
          disabled={loading}
        />
        <Input
          label="Подтверждение пароля"
          name="confirm"
          type="password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(''); }}
          placeholder="Повторите пароль"
          error={error}
          disabled={loading}
        />
        <Button type="submit" variant="primary" fullWidth loading={loading}>
          Сохранить пароль
        </Button>
      </form>
    </div>
  );
}
