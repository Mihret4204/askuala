import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import type { AccountStatus, UserRole, UserSummary } from '@/types/api';

export function ProfilePage() {
  const navigate = useNavigate();
  const storeUser = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Fetch the live profile from GET /auth/me — provides the freshest data.
  // Fall back to the store snapshot while loading or on error.
  const { data, isLoading, isError } = useQuery<UserSummary>({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().then((r) => r.data),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data) {
      useAuthStore.setState({ user: data });
    }
  }, [data]);

  const user = data ?? storeUser;

  if (!user) {
    return null;
  }

  const roleLabel: Record<UserRole, string> = {
    ADMIN: 'Administrator',
    REGISTRAR: 'Registrar',
    FACULTY_DEAN: 'Faculty Dean',
    HOD: 'Head of Department',
    INSTRUCTOR: 'Instructor',
    STUDENT: 'Student',
  };

  const statusColour: Record<AccountStatus, string> = {
    ACTIVE: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400',
    INACTIVE: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
    SUSPENDED: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    ARCHIVED: 'text-slate-400 bg-slate-100 dark:bg-slate-800',
  };

  const handleSignOut = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">
          Profile
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {user.firstName} {user.lastName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{user.email}</p>

        {isLoading && (
          <p className="mt-3 text-xs text-slate-400">Refreshing profile…</p>
        )}
        {isError && (
          <p className="mt-3 text-xs text-rose-500">
            Could not refresh profile. Showing cached data.
          </p>
        )}
      </div>

      {/* Details */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Account details
        </h2>
        <dl className="space-y-4">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-slate-500">Role</dt>
            <dd className="text-sm font-medium">
              {roleLabel[user.role] ?? user.role}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-slate-500">Status</dt>
            <dd>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColour[user.status] ?? ''}`}
              >
                {user.status}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-slate-500">User ID</dt>
            <dd className="font-mono text-xs text-slate-400">{user.id}</dd>
          </div>
        </dl>
      </div>

      {/* Danger zone */}
      <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-sm dark:border-rose-900/30 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-rose-500">
          Session
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Signing out clears your session from this device.
        </p>
        <button
          onClick={handleSignOut}
          className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/20"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
}
