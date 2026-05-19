'use client';

import * as React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle } from 'lucide-react';

const schema = z.object({ email: z.string().email('Введите корректный email') });

function ForgotPasswordForm() {
  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState('');
  const [serverError, setServerError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
    if (serverError) setServerError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const result = schema.safeParse({ email });
    if (!result.success) {
      setEmailError(result.error.errors[0]?.message ?? 'Ошибка');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: result.data.email }),
      });

      if (res.ok) {
        setSent(true);
        return;
      }

      const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
      setServerError(body.error?.message ?? 'Произошла ошибка. Попробуйте позже.');
    } catch {
      setServerError('Ошибка соединения. Попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="animate-slide-up text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-champagne" />
        </div>
        <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight mb-2">
          Письмо отправлено
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Если аккаунт с адресом <strong className="text-text-primary">{email}</strong> существует,
          вы получите письмо со ссылкой для сброса пароля. Ссылка действительна 1 час.
        </p>
        <p className="text-xs text-text-tertiary mb-6">
          Не получили письмо? Проверьте папку «Спам» или попробуйте снова через несколько минут.
        </p>
        <Link
          href="/login"
          className="text-sm text-champagne hover:text-champagne-light transition-colors"
        >
          Вернуться к входу
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
          Введите email вашего аккаунта — мы отправим ссылку для сброса пароля
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={handleChange}
          error={emailError}
          placeholder="admin@shantelyur.ru"
          autoComplete="email"
          autoFocus
          disabled={isLoading}
        />

        {serverError && (
          <div
            className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400"
            role="alert"
          >
            {serverError}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isLoading}
        >
          Отправить ссылку
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-text-tertiary hover:text-champagne transition-colors"
        >
          Вернуться к входу
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ForgotPasswordForm />
    </React.Suspense>
  );
}
