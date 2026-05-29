'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/language';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [fields, setFields] = React.useState({ email: '', password: '' });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [serverError, setServerError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const loginSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(6, t('auth.passwordMin6')),
  });

  type LoginFields = z.infer<typeof loginSchema>;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FieldErrors]) {
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
        body: JSON.stringify(result.data),
        credentials: 'include',
      });

      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({})) as { message?: string };
      setServerError(body.message ?? t('auth.badCredentials'));
    } catch {
      setServerError(t('auth.networkError'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="animate-slide-up">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-medium text-text-primary tracking-tight">
          {t('auth.welcome')}
        </h2>
        <p className="text-sm text-text-secondary mt-1.5">
          {t('auth.loginSubtitle')}
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
          label={t('auth.password')}
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
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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

        <div className="flex items-center justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-text-tertiary hover:text-champagne transition-colors"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isLoading}
        >
          {t('auth.login')}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-text-tertiary">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="text-champagne hover:text-champagne-light transition-colors">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
