'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { DEFAULT_REDIRECT } from '@/lib/permissions';

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
});

type LoginFields = z.infer<typeof loginSchema>;
type FieldErrors = Partial<Record<keyof LoginFields, string>>;

interface LoginApiResponse {
  success: boolean;
  data?: {
    user?: { role?: string };
  };
  error?: { code?: string; message?: string };
  message?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [fields, setFields] = React.useState<LoginFields>({ email: '', password: '' });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [serverError, setServerError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginFields]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) setServerError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError('');

    const result = loginSchema.safeParse(fields);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof LoginFields;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...result.data, rememberMe }),
        credentials: 'include',
      });

      const body = await res.json().catch(() => ({})) as LoginApiResponse;

      if (res.ok && body.success) {
        const role = body.data?.user?.role ?? '';
        // Role-based post-login redirect
        const destination = redirectParam ?? DEFAULT_REDIRECT[role] ?? '/dashboard';
        router.push(destination);
        router.refresh();
        return;
      }

      // Surface server error message accurately
      const msg = body.error?.message ?? body.message ?? 'Неверный email или пароль';
      setServerError(msg);
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
          Добро пожаловать
        </h2>
        <p className="text-sm text-text-secondary mt-1.5">
          Войдите в систему управления студией
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          label="Email"
          name="email"
          type="email"
          value={fields.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="admin@shantelyur.ru"
          autoComplete="email"
          autoFocus
          disabled={isLoading}
        />

        <Input
          label="Пароль"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={fields.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isLoading}
          rightAddon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-0.5 text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
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

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-border-luxury bg-charcoal text-champagne focus:ring-champagne/30 focus:ring-offset-0 focus:ring-2 cursor-pointer"
            />
            <span className="text-xs text-text-tertiary group-hover:text-text-secondary transition-colors">
              Запомнить меня
            </span>
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-text-tertiary hover:text-champagne transition-colors"
          >
            Забыли пароль?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isLoading}
        >
          Войти
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-text-tertiary">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-champagne hover:text-champagne-light transition-colors">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
