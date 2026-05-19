'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

const schema = z
  .object({
    password: z.string().min(8, 'Пароль должен быть не менее 8 символов').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type Fields = z.infer<typeof schema>;
type FieldErrors = Partial<Record<keyof Fields, string>>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [fields, setFields] = React.useState<Fields>({ password: '', confirmPassword: '' });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [serverError, setServerError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [done, setDone] = React.useState(false);

  if (!token) {
    return (
      <div className="animate-slide-up text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-medium text-text-primary mb-2">
          Ссылка недействительна
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Ссылка для сброса пароля недействительна или устарела.
          Запросите новую ссылку.
        </p>
        <Link href="/forgot-password" className="text-sm text-champagne hover:text-champagne-light transition-colors">
          Запросить новую ссылку
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="animate-slide-up text-center">
        <CheckCircle className="w-12 h-12 text-champagne mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-medium text-text-primary mb-2">
          Пароль изменён
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Ваш пароль успешно обновлён. Войдите с новым паролем.
        </p>
        <Link href="/login" className="text-sm text-champagne hover:text-champagne-light transition-colors">
          Войти
        </Link>
      </div>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof Fields]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (serverError) setServerError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const result = schema.safeParse(fields);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof Fields;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: result.data.password }),
      });

      if (res.ok) {
        setDone(true);
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

  return (
    <div className="animate-slide-up">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">
          Новый пароль
        </h2>
        <p className="text-sm text-text-secondary mt-1.5">
          Придумайте надёжный пароль для вашего аккаунта
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Новый пароль"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={fields.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="Минимум 8 символов"
          autoComplete="new-password"
          autoFocus
          disabled={isLoading}
          rightAddon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-0.5 text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <Input
          label="Подтвердите пароль"
          name="confirmPassword"
          type={showConfirm ? 'text' : 'password'}
          value={fields.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          placeholder="Повторите пароль"
          autoComplete="new-password"
          disabled={isLoading}
          rightAddon={
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="p-0.5 text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label={showConfirm ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
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
          Сохранить пароль
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-text-tertiary hover:text-champagne transition-colors">
          Вернуться к входу
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
