import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import type { ApiErrorShape } from '@/types/api';

// Matches backend RegisterDto exactly:
// email, password (min 6), firstName (min 1), lastName (min 1), role? (optional)
const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setApiError(null);
    try {
      // role defaults to STUDENT on the backend when omitted
      const { data } = await authApi.register(values);
      setAuth(data.user, data.accessToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiErr = err as ApiErrorShape;
      setApiError(
        apiErr.status === 409
          ? 'An account with this email already exists.'
          : (apiErr.message ?? 'Something went wrong. Please try again.'),
      );
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <p className="mt-2 text-sm text-slate-500">Set up your SIS account to get started.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm" htmlFor="firstName">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              aria-invalid={errors.firstName ? 'true' : undefined}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-800"
              {...register('firstName')}
            />
            {errors.firstName ? (
              <p role="alert" className="mt-1 text-sm text-rose-500">
                {errors.firstName.message}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm" htmlFor="lastName">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              aria-invalid={errors.lastName ? 'true' : undefined}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-slate-800"
              {...register('lastName')}
            />
            {errors.lastName ? (
              <p role="alert" className="mt-1 text-sm text-rose-500">
                {errors.lastName.message}
              </p>
            ) : null}
          </div>
        </div>

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
            autoComplete="new-password"
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-500">
        Already have an account?{' '}
        <Link className="font-medium text-slate-900 dark:text-slate-100" to="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
