'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'Имя должно быть не менее 2 символов'),
    lastName: z.string().min(2, 'Фамилия должна быть не менее 2 символов'),
    email: z.string().email('Введите корректный email'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Пароль должен быть не менее 8 символов'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type RegisterFields = z.infer<typeof registerSchema>;
type FieldErrors = Partial<Record<keyof RegisterFields, string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [fields, setFields] = React.useState<RegisterFields>({
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof RegisterFields]) {
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

      const body = await res.json().catch(() => ({})) as { message?: string };
      setServerError(body.message ?? 'Ошибка регистрации. Попробуйте позже.');
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
          Создать аккаунт
        </h2>
        <p className="text-sm text-text-secondary mt-1.5">
          Первоначальная настройка студии
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Имя"
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
            label="Фамилия"
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
          label="Телефон (необязательно)"
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
          label="Пароль"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={fields.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="Минимум 8 символов"
          autoComplete="new-password"
          disabled={isLoading}
          helperText={!errors.password ? 'Минимум 8 символов' : undefined}
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
          className="w-full mt-2"
          isLoading={isLoading}
        >
          Создать аккаунт
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-text-tertiary">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-champagne hover:text-champagne-light transition-colors">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
