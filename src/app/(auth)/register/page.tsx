'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/language';

type FieldErrors = Partial<Record<'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'confirmPassword', string>>;

export default function RegisterPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [fields, setFields] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [serverError, setServerError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const registerSchema = z
    .object({
      firstName: z.string().min(2, t('auth.firstNameMin')),
      lastName: z.string().min(2, t('auth.lastNameMin')),
      email: z.string().email(t('auth.invalidEmail')),
      phone: z.string().optional(),
      password: z.string().min(8, t('auth.passwordMin8')),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: t('auth.passwordMismatch'),
      path: ['confirmPassword'],
    });

  type RegisterFields = z.infer<typeof registerSchema>;

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

    const result = registerSchema.safeParse(fields);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof RegisterFields;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const { confirmPassword: _confirm, ...payload } = result.data;
      void _confirm;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
      setServerError(body.error?.message ?? body.message ?? t('auth.registerError'));
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
          {t('auth.createAccount')}
        </h2>
        <p className="text-sm text-text-secondary mt-1.5">
          {t('auth.registerSubtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('auth.firstName')}
            name="firstName"
            type="text"
            value={fields.firstName}
            onChange={handleChange}
            error={errors.firstName}
            placeholder="Мария"
            autoComplete="given-name"
            autoFocus
            disabled={isLoading}
          />
          <Input
            label={t('auth.lastName')}
            name="lastName"
            type="text"
            value={fields.lastName}
            onChange={handleChange}
            error={errors.lastName}
            placeholder="Иванова"
            autoComplete="family-name"
            disabled={isLoading}
          />
        </div>

        <Input
          label="Email"
          name="email"
          type="email"
          value={fields.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="admin@shantelyur.ru"
          autoComplete="email"
          disabled={isLoading}
        />

        <Input
          label={t('auth.phoneOptional')}
          name="phone"
          type="tel"
          value={fields.phone}
          onChange={handleChange}
          error={errors.phone}
          placeholder="+7 (999) 000-00-00"
          autoComplete="tel"
          disabled={isLoading}
        />

        <Input
          label={t('auth.password')}
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={fields.password}
          onChange={handleChange}
          error={errors.password}
          placeholder={t('auth.passwordMin8hint')}
          autoComplete="new-password"
          disabled={isLoading}
          helperText={!errors.password ? t('auth.passwordMin8hint') : undefined}
          rightAddon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-0.5 text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <Input
          label={t('auth.confirmPassword')}
          name="confirmPassword"
          type={showConfirm ? 'text' : 'password'}
          value={fields.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          placeholder={t('auth.repeatPassword')}
          autoComplete="new-password"
          disabled={isLoading}
          rightAddon={
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="p-0.5 text-text-tertiary hover:text-text-secondary transition-colors"
              aria-label={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
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
          className="w-full mt-2"
          isLoading={isLoading}
        >
          {t('auth.createAccount')}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-text-tertiary">
          {t('auth.haveAccount')}{' '}
          <Link href="/login" className="text-champagne hover:text-champagne-light transition-colors">
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
