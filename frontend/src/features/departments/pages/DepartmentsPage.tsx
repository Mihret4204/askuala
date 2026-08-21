import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Plus } from 'lucide-react';
import { departmentsApi, facultiesApi, instructorsApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import type { DepartmentRecord, CreateDepartmentPayload, ApiErrorShape } from '@/types/api';

const WRITABLE_ROLES = new Set(['ADMIN', 'REGISTRAR', 'FACULTY_DEAN']);

const schema = z.object({
  facultyId: z.string().uuid('Select a faculty.'),
  code: z.string().min(1, 'Code is required.'),
  name: z.string().min(2, 'Name is required.'),
  description: z.string().optional(),
  headInstructorId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function CreateDepartmentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: faculties = [] } = useQuery({
    queryKey: ['faculties'],
    queryFn: () => facultiesApi.list().then((r) => r.data),
    staleTime: 30_000,
  });
  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => instructorsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (p: CreateDepartmentPayload) => departmentsApi.create(p).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); onClose(); },
    onError: (e: ApiErrorShape) =>
      setApiError(e.status === 409 ? 'Department code already exists.' : (e.message ?? 'Failed.')),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (v: FormValues) => {
    setApiError(null);
    const payload: CreateDepartmentPayload = {
      facultyId: v.facultyId,
      code: v.code,
      name: v.name,
      description: v.description || undefined,
      headInstructorId: v.headInstructorId || undefined,
    };
    mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Create department</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-sm" htmlFor="d-faculty">Faculty</label>
            <select id="d-faculty" className="input-base" {...register('facultyId')}>
              <option value="">Select faculty…</option>
              {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {errors.facultyId && <p className="err">{errors.facultyId.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="d-code">Code</label>
              <input id="d-code" className="input-base" {...register('code')} />
              {errors.code && <p className="err">{errors.code.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="d-name">Name</label>
              <input id="d-name" className="input-base" {...register('name')} />
              {errors.name && <p className="err">{errors.name.message}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="d-desc">Description (optional)</label>
            <textarea id="d-desc" rows={2} className="input-base resize-none" {...register('description')} />
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="d-head">Head instructor (optional)</label>
            <select id="d-head" className="input-base" {...register('headInstructorId')}>
              <option value="">None</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.user.firstName} {i.user.lastName} — {i.department.name}
                </option>
              ))}
            </select>
          </div>
          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating…' : 'Create department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DepartmentsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useQuery<DepartmentRecord[]>({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter(
    (d) => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase()),
  );

  const errMsg = isError ? ((error as ApiErrorShape).message ?? 'Failed to load departments.') : null;

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Academic departments across all faculties"
        action={
          role && WRITABLE_ROLES.has(role) ? (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> New department
            </button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <input type="search" placeholder="Search departments…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-base max-w-sm" aria-label="Search departments" />
      </div>

      {errMsg && <ErrorAlert message={errMsg} />}

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No departments found" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Code', 'Name', 'Faculty', 'Head', 'Programs', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{d.code}</td>
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-slate-500">{d.faculty.name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {d.headInstructor
                      ? `${d.headInstructor.user.firstName} ${d.headInstructor.user.lastName}`
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">{d.programs.length}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <CreateDepartmentModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
