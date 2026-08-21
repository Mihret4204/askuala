import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DoorOpen, Plus } from 'lucide-react';
import { buildingsApi, roomsApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import type { RoomRecord, CreateRoomPayload, ApiErrorShape, RoomType } from '@/types/api';

const WRITABLE_ROLES = new Set(['ADMIN', 'REGISTRAR']);

const ROOM_TYPES: RoomType[] = ['LECTURE_HALL', 'LABORATORY', 'COMPUTER_LAB', 'SEMINAR_ROOM', 'OFFICE'];

const schema = z.object({
  buildingId: z.string().uuid('Select a building.'),
  code: z.string().min(1, 'Room code is required.'),
  roomNumber: z.string().min(1, 'Room number is required.'),
  name: z.string().optional(),
  type: z.enum(['LECTURE_HALL', 'LABORATORY', 'COMPUTER_LAB', 'SEMINAR_ROOM', 'OFFICE']).optional(),
  capacity: z.string().refine(
    (val) => Number.isInteger(Number(val)) && Number(val) >= 1,
    'Capacity must be at least 1.',
  ),
  floorLevel: z.string().optional().refine(
    (val) => !val || (Number.isInteger(Number(val)) && Number(val) >= 0),
    'Floor level cannot be negative.',
  ),
  isAccessible: z.boolean().optional(),
  hasProjector: z.boolean().optional(),
  hasComputers: z.boolean().optional(),
  computerCount: z.string().optional().refine(
    (val) => !val || (Number.isInteger(Number(val)) && Number(val) >= 0),
    'Computer count cannot be negative.',
  ),
  hasLabEquipment: z.boolean().optional(),
});

interface FormData {
  buildingId: string;
  code: string;
  roomNumber: string;
  name?: string;
  type?: RoomType;
  capacity: string;
  floorLevel?: string;
  isAccessible?: boolean;
  hasProjector?: boolean;
  hasComputers?: boolean;
  computerCount?: string;
  hasLabEquipment?: boolean;
}

function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => buildingsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (p: CreateRoomPayload) => roomsApi.create(p).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); onClose(); },
    onError: (e: ApiErrorShape) => {
      if (e.status === 409) {
        setApiError('Room code already exists.');
      } else if (e.status === 400) {
        setApiError('Computer count must be 0 when computers are not available.');
      } else {
        setApiError(e.message ?? 'Failed to create room.');
      }
    },
  });

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      isAccessible: false,
      hasProjector: false,
      hasComputers: false,
      computerCount: '0',
      hasLabEquipment: false,
    },
  });

  const hasComputers = watch('hasComputers');

  const onSubmit = (v: FormData) => {
    setApiError(null);
    const payload: CreateRoomPayload = {
      buildingId: v.buildingId,
      code: v.code.toUpperCase(),
      roomNumber: v.roomNumber,
      name: v.name || undefined,
      type: v.type as RoomType | undefined,
      capacity: parseInt(v.capacity, 10),
      floorLevel: v.floorLevel ? parseInt(v.floorLevel, 10) : undefined,
      isAccessible: v.isAccessible,
      hasProjector: v.hasProjector,
      hasComputers: v.hasComputers,
      computerCount: v.computerCount ? parseInt(v.computerCount, 10) : undefined,
      hasLabEquipment: v.hasLabEquipment,
    };
    mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold">Create room</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="r-building">Building</label>
              <select id="r-building" className="input-base" {...register('buildingId')}>
                <option value="">Select building…</option>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
              </select>
              {errors.buildingId && <p className="err">{errors.buildingId.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="r-code">Code</label>
              <input id="r-code" className="input-base" placeholder="e.g., ENG-201" {...register('code')} />
              {errors.code && <p className="err">{errors.code.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="r-number">Room Number</label>
              <input id="r-number" className="input-base" placeholder="e.g., 201" {...register('roomNumber')} />
              {errors.roomNumber && <p className="err">{errors.roomNumber.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="r-name">Name (optional)</label>
              <input id="r-name" className="input-base" placeholder="e.g., Advanced Lab" {...register('name')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="r-type">Type (optional)</label>
              <select id="r-type" className="input-base" {...register('type')}>
                <option value="">Default (Lecture Hall)</option>
                {ROOM_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="r-capacity">Capacity</label>
              <input id="r-capacity" type="number" className="input-base" placeholder="e.g., 50" {...register('capacity')} />
              {errors.capacity && <p className="err">{errors.capacity.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="r-floor">Floor Level (optional)</label>
              <input id="r-floor" type="number" className="input-base" placeholder="e.g., 2" {...register('floorLevel')} />
              {errors.floorLevel && <p className="err">{errors.floorLevel.message}</p>}
            </div>
          </div>

          <fieldset className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <legend className="text-sm font-medium">Room Features</legend>
            <div className="flex items-center gap-2">
              <input id="r-accessible" type="checkbox" className="input-checkbox" {...register('isAccessible')} />
              <label htmlFor="r-accessible" className="text-sm">Wheelchair accessible</label>
            </div>
            <div className="flex items-center gap-2">
              <input id="r-projector" type="checkbox" className="input-checkbox" {...register('hasProjector')} />
              <label htmlFor="r-projector" className="text-sm">Has projector</label>
            </div>
            <div className="flex items-center gap-2">
              <input id="r-computers" type="checkbox" className="input-checkbox" {...register('hasComputers')} />
              <label htmlFor="r-computers" className="text-sm">Has computers</label>
            </div>
            {hasComputers && (
              <div className="ml-6">
                <label className="mb-1 block text-sm" htmlFor="r-computer-count">Number of computers</label>
                <input id="r-computer-count" type="number" className="input-base max-w-xs" placeholder="e.g., 30" {...register('computerCount')} />
                {errors.computerCount && <p className="err">{errors.computerCount.message}</p>}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input id="r-lab" type="checkbox" className="input-checkbox" {...register('hasLabEquipment')} />
              <label htmlFor="r-lab" className="text-sm">Has lab equipment</label>
            </div>
          </fieldset>

          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating…' : 'Create room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RoomsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  const { data, isLoading, isError, error } = useQuery<RoomRecord[]>({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter((r) => {
    const matchesSearch = !search || 
      r.code.toLowerCase().includes(search.toLowerCase()) || 
      r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.building.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = !filterType || r.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const errMsg = isError ? ((error as ApiErrorShape).message ?? 'Failed to load rooms.') : null;

  return (
    <div>
      <PageHeader
        title="Rooms"
        subtitle="Campus rooms and facilities"
        action={
          role && WRITABLE_ROLES.has(role) ? (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> New room
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input type="search" placeholder="Search rooms…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-base flex-1 max-w-sm" aria-label="Search rooms" />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-base max-w-xs">
          <option value="">All types</option>
          {ROOM_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {errMsg && <ErrorAlert message={errMsg} />}

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No rooms found" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Building', 'Code', 'Room', 'Type', 'Capacity', 'Features'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.building.code}</td>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{r.code}</td>
                  <td className="px-4 py-3 font-medium">{r.name || r.roomNumber}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">{r.capacity}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {r.isAccessible && <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900 dark:text-blue-200">♿</span>}
                      {r.hasProjector && <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700 dark:bg-purple-900 dark:text-purple-200">📽</span>}
                      {r.hasComputers && <span className="rounded-full bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900 dark:text-green-200">💻 {r.computerCount}</span>}
                      {r.hasLabEquipment && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900 dark:text-amber-200">⚗️</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <CreateRoomModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
