import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Users } from 'lucide-react';
import { usersApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import type { UserRecord, CreateUserPayload, UserRole, ApiErrorShape } from '@/types/api';

// ---------------------------------------------------------------------------
// Schema matches backend CreateUserDto exactly
// ---------------------------------------------------------------------------
const ROLES: UserRole[] = ['ADMIN', 'REGISTRAR', 'FACULTY_DEAN', 'HOD', 'INSTRUCTOR', 'STUDENT'];

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['ADMIN', 'REGISTRAR', 'FACULTY_DEAN', 'HOD', 'INSTRUCTOR', 'STUDENT'] as const),
});
type CreateUserForm = z.infer<typeof createUserSchema>;

// ---------------------------------------------------------------------------
// Modal — only shown to ADMIN
// ---------------------------------------------------------------------------
interface CreateUserModalProps {
  onClose: () => void;
}

function CreateUserModal({ onClose }: CreateUserModalProps) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err: ApiErrorShape) => {
      setApiError(
        err.status === 409
          ? 'A user with this email already exists.'
          : (err.message ?? 'Failed to create user.'),
      );
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'STUDENT' },
  });

  const onSubmit = (values: CreateUserForm) => {
    setApiError(null);
    mutate(values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Create user</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="u-firstName">First name</label>
              <input id="u-firstName" className="input-base" {...register('firstName')} />
              {errors.firstName && <p className="err">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="u-lastName">Last name</label>
              <input id="u-lastName" className="input-base" {...register('lastName')} />
              {errors.lastName && <p className="err">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="u-email">Email</label>
            <input id="u-email" type="email" className="input-base" {...register('email')} />
            {errors.email && <p className="err">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="u-password">Password</label>
            <input id="u-password" type="password" className="input-base" {...register('password')} />
            {errors.password && <p className="err">{errors.password.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="u-role">Role</label>
            <select id="u-role" className="input-base" {...register('role')}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.role && <p className="err">{errors.role.message}</p>}
          </div>
          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function UsersPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase()),
  );

  const errMsg = isError ? ((error as ApiErrorShape).message ?? 'Failed to load users.') : null;

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="All system accounts"
        action={
          role === 'ADMIN' ? (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              New user
            </button>
          ) : undefined
        }
      />

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base max-w-sm"
          aria-label="Search users"
        />
      </div>

      {errMsg && <ErrorAlert message={errMsg} />}

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description={search ? 'Try a different search.' : undefined} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Name', 'Email', 'Role', 'Status', 'Created'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium dark:bg-slate-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3 text-slate-400 tabular-nums">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <CreateUserModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
