import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, Plus } from 'lucide-react';
import { programsApi, departmentsApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import type { ProgramRecord, CreateProgramPayload, DegreeType, ApiErrorShape } from '@/types/api';

const WRITABLE_ROLES = new Set(['ADMIN', 'REGISTRAR', 'HOD']);
const DEGREE_TYPES: DegreeType[] = ['DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE', 'CERTIFICATE'];

const schema = z.object({
  departmentId: z.string().uuid('Select a department.'),
  code: z.string().min(1, 'Code is required.'),
  name: z.string().min(2, 'Name is required.'),
  degreeType: z.enum(['DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE', 'CERTIFICATE'] as const).optional(),
  durationYears: z.union([z.number().min(0.5, 'Minimum 0.5 years.'), z.string().transform((v) => Number(v))]),
  totalCreditsRequired: z.union([z.number().int().min(1, 'At least 1 credit required.'), z.string().transform((v) => Number(v))]),
});
type FormValues = z.input<typeof schema>;

function CreateProgramModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (p: CreateProgramPayload) => programsApi.create(p).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['programs'] }); onClose(); },
    onError: (e: ApiErrorShape) =>
      setApiError(e.status === 409 ? 'Program code already exists.' : (e.message ?? 'Failed.')),
  });

const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { degreeType: 'BACHELOR', durationYears: 4, totalCreditsRequired: 120 },
  });

  const onSubmit = (v: FormValues) => {
    setApiError(null);
    mutate({
      departmentId: v.departmentId,
      code: v.code,
      name: v.name,
      degreeType: v.degreeType ?? 'BACHELOR',
      durationYears: Number(v.durationYears),
      totalCreditsRequired: Number(v.totalCreditsRequired),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Create program</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-sm" htmlFor="p-dept">Department</label>
            <select id="p-dept" className="input-base" {...register('departmentId')}>
              <option value="">Select department…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {errors.departmentId && <p className="err">{errors.departmentId.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="p-code">Code</label>
              <input id="p-code" className="input-base" placeholder="BSC-CS" {...register('code')} />
              {errors.code && <p className="err">{errors.code.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="p-degree">Degree type</label>
              <select id="p-degree" className="input-base" {...register('degreeType')}>
                {DEGREE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="p-name">Name</label>
            <input id="p-name" className="input-base" {...register('name')} />
            {errors.name && <p className="err">{errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="p-years">Duration (years)</label>
              <input id="p-years" type="number" step="0.5" className="input-base" {...register('durationYears')} />
              {errors.durationYears && <p className="err">{errors.durationYears.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="p-credits">Total credits</label>
              <input id="p-credits" type="number" className="input-base" {...register('totalCreditsRequired')} />
              {errors.totalCreditsRequired && <p className="err">{errors.totalCreditsRequired.message}</p>}
            </div>
          </div>
          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating…' : 'Create program'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProgramsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useQuery<ProgramRecord[]>({
    queryKey: ['programs'],
    queryFn: () => programsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  const errMsg = isError ? ((error as ApiErrorShape).message ?? 'Failed to load programs.') : null;

  return (
    <div>
      <PageHeader
        title="Programs"
        subtitle="Academic degree programs"
        action={
          role && WRITABLE_ROLES.has(role) ? (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> New program
            </button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <input type="search" placeholder="Search programs…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-base max-w-sm" aria-label="Search programs" />
      </div>

      {errMsg && <ErrorAlert message={errMsg} />}

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No programs found" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Code', 'Name', 'Degree', 'Department', 'Duration', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{p.code}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.degreeType}</td>
                  <td className="px-4 py-3 text-slate-500">{p.department.name}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">{p.durationYears} yrs</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <CreateProgramModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
