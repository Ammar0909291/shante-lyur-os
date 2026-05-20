'use client';

import * as React from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Введите email'); return; }
    setLoading(true); setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError('Ошибка соединения. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="animate-slide-up text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-champagne" />
        </div>
        <h2 className="font-serif text-2xl font-medium text-text-primary">Письмо отправлено</h2>
        <p className="text-sm text-text-secondary mt-2 mb-6">
          Если этот email зарегистрирован, вы получите ссылку для сброса пароля.<br />
          Ссылка действительна 1 час.
        </p>
        <Link href="/login" className="text-sm text-champagne hover:underline">
          ← Вернуться ко входу
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">
          Сброс пароля
        </h2>
        <p className="text-sm text-text-secondary mt-1.5">
          Введите email — мы отправим ссылку для входа
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          error={error}
          placeholder="admin@shantelyur.ru"
          autoFocus
          disabled={loading}
        />

        <Button type="submit" variant="primary" fullWidth loading={loading}>
          Отправить ссылку
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-tertiary">
        Вспомнили пароль?{' '}
        <Link href="/login" className="text-champagne hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
