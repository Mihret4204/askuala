import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Plus } from 'lucide-react';
import { buildingsApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import type { BuildingRecord, CreateBuildingPayload, ApiErrorShape } from '@/types/api';

const WRITABLE_ROLES = new Set(['ADMIN', 'REGISTRAR']);

const schema = z.object({
  code: z.string().min(1, 'Building code is required.'),
  name: z.string().min(2, 'Building name is required.'),
  campusName: z.string().min(2, 'Campus name is required.'),
  totalFloors: z.string().optional().refine(
    (val) => !val || (Number.isInteger(Number(val)) && Number(val) >= 1),
    'Minimum 1 floor.',
  ),
});

interface FormData {
  code: string;
  name: string;
  campusName: string;
  totalFloors?: string;
}

function CreateBuildingModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (p: CreateBuildingPayload) => buildingsApi.create(p).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buildings'] }); onClose(); },
    onError: (e: ApiErrorShape) =>
      setApiError(e.status === 409 ? 'Building code already exists.' : (e.message ?? 'Failed to create building.')),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (v: FormData) => {
    setApiError(null);
    const payload: CreateBuildingPayload = {
      code: v.code.toUpperCase(),
      name: v.name,
      campusName: v.campusName,
      totalFloors: v.totalFloors ? parseInt(v.totalFloors, 10) : undefined,
    };
    mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Create building</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-sm" htmlFor="b-code">Code</label>
            <input id="b-code" className="input-base" placeholder="e.g., BLK-A" {...register('code')} />
            {errors.code && <p className="err">{errors.code.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="b-name">Name</label>
            <input id="b-name" className="input-base" placeholder="e.g., Engineering Block A" {...register('name')} />
            {errors.name && <p className="err">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="b-campus">Campus</label>
            <input id="b-campus" className="input-base" placeholder="e.g., Main Campus" {...register('campusName')} />
            {errors.campusName && <p className="err">{errors.campusName.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="b-floors">Total Floors (optional)</label>
            <input id="b-floors" type="number" className="input-base" placeholder="e.g., 5" {...register('totalFloors')} />
            {errors.totalFloors && <p className="err">{errors.totalFloors.message}</p>}
          </div>
          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating…' : 'Create building'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BuildingsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error } = useQuery<BuildingRecord[]>({
    queryKey: ['buildings'],
    queryFn: () => buildingsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter(
    (b) => !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase()) || b.campusName.toLowerCase().includes(search.toLowerCase()),
  );

  const errMsg = isError ? ((error as ApiErrorShape).message ?? 'Failed to load buildings.') : null;

  return (
    <div>
      <PageHeader
        title="Buildings"
        subtitle="Campus buildings and infrastructure"
        action={
          role && WRITABLE_ROLES.has(role) ? (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> New building
            </button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <input type="search" placeholder="Search buildings…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-base max-w-sm" aria-label="Search buildings" />
      </div>

      {errMsg && <ErrorAlert message={errMsg} />}

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No buildings found" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Code', 'Name', 'Campus', 'Floors', 'Rooms'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{b.code}</td>
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 text-slate-500">{b.campusName}</td>
                  <td className="px-4 py-3 text-slate-500">{b.totalFloors ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">{b.rooms.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <CreateBuildingModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
