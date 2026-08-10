import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import type { ApiErrorShape } from '@/types/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);
    try {
      const { data } = await authApi.login(values);
      setAuth(data.user, data.accessToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiErr = err as ApiErrorShape;
      setApiError(
        apiErr.status === 401
          ? 'Invalid email or password.'
          : (apiErr.message ?? 'Something went wrong. Please try again.'),
      );
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-slate-500">Use your SIS credentials to continue.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div>
          <label className="mb-2 block text-sm" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? 'true' : undefined}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-800"
            {...register('email')}
          />
          {errors.email ? (
            <p role="alert" className="mt-1 text-sm text-rose-500">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? 'true' : undefined}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-800"
            {...register('password')}
          />
          {errors.password ? (
            <p role="alert" className="mt-1 text-sm text-rose-500">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        {apiError ? (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
            {apiError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-500">
        New here?{' '}
        <Link className="font-medium text-slate-900 dark:text-slate-100" to="/register">
          Create account
        </Link>
      </p>
    </div>
  );
}
