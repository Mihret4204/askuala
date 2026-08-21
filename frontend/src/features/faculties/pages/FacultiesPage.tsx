import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Plus } from 'lucide-react';
import { facultiesApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import type { FacultyRecord, CreateFacultyPayload, ApiErrorShape } from '@/types/api';

const WRITABLE_ROLES = new Set(['ADMIN', 'REGISTRAR']);

const schema = z.object({
  code: z.string().min(1, 'Code is required.').max(20),
  name: z.string().min(2, 'Name is required.'),
  description: z.string().optional(),
  establishedYear: z.union([z.number().int().min(1800).max(new Date().getFullYear()), z.string().transform((v) => Number(v))]).optional(),
});
type FormValues = z.input<typeof schema>;

function CreateFacultyModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (p: CreateFacultyPayload) => facultiesApi.create(p).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faculties'] }); onClose(); },
    onError: (e: ApiErrorShape) =>
      setApiError(e.status === 409 ? 'Faculty code already exists.' : (e.message ?? 'Failed.')),
  });

const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (v: FormValues) => {
    setApiError(null);
mutate({
      code: v.code,
      name: v.name,
      description: v.description || undefined,
      establishedYear: v.establishedYear ? Number(v.establishedYear) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Create faculty</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-sm" htmlFor="f-code">Code</label>
            <input id="f-code" className="input-base" placeholder="e.g. ENG" {...register('code')} />
            {errors.code && <p className="err">{errors.code.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="f-name">Name</label>
            <input id="f-name" className="input-base" {...register('name')} />
            {errors.name && <p className="err">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="f-desc">Description (optional)</label>
            <textarea id="f-desc" rows={2} className="input-base resize-none" {...register('description')} />
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="f-year">Established year (optional)</label>
            <input id="f-year" type="number" className="input-base" {...register('establishedYear')} />
            {errors.establishedYear && <p className="err">{errors.establishedYear.message}</p>}
          </div>
          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating…' : 'Create faculty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FacultiesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useQuery<FacultyRecord[]>({
    queryKey: ['faculties'],
    queryFn: () => facultiesApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter(
    (f) => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.code.toLowerCase().includes(search.toLowerCase()),
  );

  const errMsg = isError ? ((error as ApiErrorShape).message ?? 'Failed to load faculties.') : null;

  return (
    <div>
      <PageHeader
        title="Faculties"
        subtitle="Academic divisions of the institution"
        action={
          role && WRITABLE_ROLES.has(role) ? (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> New faculty
            </button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <input type="search" placeholder="Search faculties…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-base max-w-sm" aria-label="Search faculties" />
      </div>

      {errMsg && <ErrorAlert message={errMsg} />}

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No faculties found" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Code', 'Name', 'Departments', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{f.code}</td>
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">{f.departments.length}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <CreateFacultyModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
