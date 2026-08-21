import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Plus } from 'lucide-react';
import { instructorsApi, departmentsApi, usersApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import type { InstructorRecord, CreateInstructorPayload, ApiErrorShape } from '@/types/api';

const WRITABLE_ROLES = new Set(['ADMIN', 'REGISTRAR', 'HOD']);

const schema = z.object({
  userId: z.string().uuid('Select a user.'),
  employeeId: z.string().min(1, 'Employee ID is required.'),
  departmentId: z.string().uuid('Select a department.'),
  title: z.string().optional(),
  officeLocation: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function CreateInstructorModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    staleTime: 30_000,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (p: CreateInstructorPayload) => instructorsApi.create(p).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['instructors'] }); onClose(); },
    onError: (e: ApiErrorShape) =>
      setApiError(e.status === 409 ? 'Employee ID already registered.' : (e.message ?? 'Failed.')),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (v: FormValues) => {
    setApiError(null);
    mutate({
      userId: v.userId,
      employeeId: v.employeeId,
      departmentId: v.departmentId,
      title: v.title || undefined,
      officeLocation: v.officeLocation || undefined,
    });
  };

  // Show only users without an instructor profile (role INSTRUCTOR or HOD)
  const eligibleUsers = users.filter((u) => u.role === 'INSTRUCTOR' || u.role === 'HOD');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Create instructor profile</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-sm" htmlFor="i-user">User account</label>
            <select id="i-user" className="input-base" {...register('userId')}>
              <option value="">Select user…</option>
              {eligibleUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </select>
            {errors.userId && <p className="err">{errors.userId.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="i-empid">Employee ID</label>
            <input id="i-empid" className="input-base" {...register('employeeId')} />
            {errors.employeeId && <p className="err">{errors.employeeId.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="i-dept">Department</label>
            <select id="i-dept" className="input-base" {...register('departmentId')}>
              <option value="">Select department…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.faculty.name})</option>
              ))}
            </select>
            {errors.departmentId && <p className="err">{errors.departmentId.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="i-title">Title (optional)</label>
              <input id="i-title" className="input-base" placeholder="Dr., Prof." {...register('title')} />
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="i-office">Office (optional)</label>
              <input id="i-office" className="input-base" {...register('officeLocation')} />
            </div>
          </div>
          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating…' : 'Create instructor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function InstructorsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useQuery<InstructorRecord[]>({
    queryKey: ['instructors'],
    queryFn: () => instructorsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.user.firstName.toLowerCase().includes(q) ||
      i.user.lastName.toLowerCase().includes(q) ||
      i.employeeId.toLowerCase().includes(q) ||
      i.department.name.toLowerCase().includes(q)
    );
  });

  const errMsg = isError ? ((error as ApiErrorShape).message ?? 'Failed to load instructors.') : null;

  return (
    <div>
      <PageHeader
        title="Instructors"
        subtitle="All instructor profiles"
        action={
          role && WRITABLE_ROLES.has(role) ? (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> New instructor
            </button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <input type="search" placeholder="Search by name, ID, or department…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-base max-w-sm" aria-label="Search instructors" />
      </div>

      {errMsg && <ErrorAlert message={errMsg} />}

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No instructors found" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Employee ID', 'Name', 'Title', 'Department', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{i.employeeId}</td>
                  <td className="px-4 py-3 font-medium">{i.user.firstName} {i.user.lastName}</td>
                  <td className="px-4 py-3 text-slate-500">{i.title ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-slate-500">{i.department.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <CreateInstructorModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
