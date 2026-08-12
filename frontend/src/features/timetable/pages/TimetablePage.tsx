import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarPlus, Plus } from 'lucide-react';
import { timetableApi, courseOfferingsApi, roomsApi, instructorsApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import type {
  TimetableSlotRecord,
  CreateTimetableSlotPayload,
  ApiErrorShape,
  DayOfWeek,
  RecurrencePattern,
  SessionType,
  SlotStatus,
} from '@/types/api';

const CREATION_ROLES = new Set(['ADMIN', 'REGISTRAR', 'HOD']);

const DAYS_OF_WEEK: DayOfWeek[] = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];

const RECURRENCE_PATTERNS: RecurrencePattern[] = ['WEEKLY', 'BIWEEKLY_EVEN', 'BIWEEKLY_ODD'];

const SESSION_TYPES: SessionType[] = ['LECTURE', 'LABORATORY', 'TUTORIAL', 'SEMINAR'];

const SLOT_STATUSES: SlotStatus[] = ['ACTIVE', 'SUSPENDED', 'CANCELLED'];

const createSchema = z.object({
  courseOfferingId: z.string().uuid('Select a course offering.'),
  roomId: z.string().uuid('Select a room.'),
  instructorId: z.string().optional(),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, 'Time must be in HH:mm:ss format.'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, 'Time must be in HH:mm:ss format.'),
  startWeek: z.string().refine(
    (val) => val === '' || (Number.isInteger(Number(val)) && Number(val) >= 1),
    'Start week must be a positive integer.',
  ),
  endWeek: z.string().refine(
    (val) => val === '' || (Number.isInteger(Number(val)) && Number(val) >= 1),
    'End week must be a positive integer.',
  ),
  recurrencePattern: z.enum(['WEEKLY', 'BIWEEKLY_EVEN', 'BIWEEKLY_ODD']).optional().default('WEEKLY'),
  sessionType: z.enum(['LECTURE', 'LABORATORY', 'TUTORIAL', 'SEMINAR']).optional().default('LECTURE'),
});

interface CreateFormData {
  courseOfferingId: string;
  roomId: string;
  instructorId?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  startWeek: string;
  endWeek: string;
  recurrencePattern?: RecurrencePattern;
  sessionType?: SessionType;
}

function CreateSlotModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: courseOfferings = [] } = useQuery({
    queryKey: ['courseOfferings'],
    queryFn: () => courseOfferingsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => instructorsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (p: CreateTimetableSlotPayload) => timetableApi.create(p).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timetableSlots'] }); onClose(); },
    onError: (e: ApiErrorShape) => {
      if (e.status === 409) {
        setApiError(e.message ?? 'Scheduling conflict detected. Please check room and instructor availability.');
      } else if (e.status === 404) {
        setApiError('Course offering, room, or instructor not found.');
      } else if (e.status === 400) {
        setApiError(e.message ?? 'Invalid timetable data.');
      } else {
        setApiError(e.message ?? 'Failed to create timetable slot.');
      }
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      startWeek: '1',
      endWeek: '16',
      recurrencePattern: 'WEEKLY',
      sessionType: 'LECTURE',
    },
  });

  const onSubmit = (v: CreateFormData) => {
    setApiError(null);
    const payload: CreateTimetableSlotPayload = {
      courseOfferingId: v.courseOfferingId,
      roomId: v.roomId,
      instructorId: v.instructorId || undefined,
      dayOfWeek: v.dayOfWeek,
      startTime: v.startTime,
      endTime: v.endTime,
      startWeek: v.startWeek ? parseInt(v.startWeek, 10) : undefined,
      endWeek: v.endWeek ? parseInt(v.endWeek, 10) : undefined,
      recurrencePattern: v.recurrencePattern,
      sessionType: v.sessionType,
    };
    mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold">Create timetable slot</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="tt-offering">Course Offering</label>
              <select id="tt-offering" className="input-base" {...register('courseOfferingId')}>
                <option value="">Select offering…</option>
                {courseOfferings.map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.course.code} — {co.sectionCode} — {co.semester.code}
                  </option>
                ))}
              </select>
              {errors.courseOfferingId && <p className="err">{errors.courseOfferingId.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="tt-room">Room</label>
              <select id="tt-room" className="input-base" {...register('roomId')}>
                <option value="">Select room…</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.building.name}
                  </option>
                ))}
              </select>
              {errors.roomId && <p className="err">{errors.roomId.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="tt-day">Day of Week</label>
              <select id="tt-day" className="input-base" {...register('dayOfWeek')}>
                <option value="">Select day…</option>
                {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.dayOfWeek && <p className="err">{errors.dayOfWeek.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="tt-instructor">Instructor (optional)</label>
              <select id="tt-instructor" className="input-base" {...register('instructorId')}>
                <option value="">None</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.user.firstName} {i.user.lastName} — {i.department.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="tt-start">Start Time (HH:mm:ss)</label>
              <input id="tt-start" className="input-base" placeholder="08:30:00" {...register('startTime')} />
              {errors.startTime && <p className="err">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="tt-end">End Time (HH:mm:ss)</label>
              <input id="tt-end" className="input-base" placeholder="10:00:00" {...register('endTime')} />
              {errors.endTime && <p className="err">{errors.endTime.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="tt-start-week">Start Week</label>
              <input id="tt-start-week" type="number" className="input-base" {...register('startWeek')} />
              {errors.startWeek && <p className="err">{errors.startWeek.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="tt-end-week">End Week</label>
              <input id="tt-end-week" type="number" className="input-base" {...register('endWeek')} />
              {errors.endWeek && <p className="err">{errors.endWeek.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="tt-recurrence">Recurrence Pattern</label>
              <select id="tt-recurrence" className="input-base" {...register('recurrencePattern')}>
                {RECURRENCE_PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="tt-session">Session Type</label>
              <select id="tt-session" className="input-base" {...register('sessionType')}>
                {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating…' : 'Create slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TimetablePage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDay, setFilterDay] = useState<string>('');
  const [filterSession, setFilterSession] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRecurrence, setFilterRecurrence] = useState<string>('');

  const { data, isLoading, isError, error } = useQuery<TimetableSlotRecord[]>({
    queryKey: ['timetableSlots'],
    queryFn: () => timetableApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter((slot) => {
    const matchesSearch = !search ||
      slot.courseOffering.course.code.toLowerCase().includes(search.toLowerCase()) ||
      slot.courseOffering.course.title.toLowerCase().includes(search.toLowerCase()) ||
      slot.instructor?.user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      slot.instructor?.user.lastName.toLowerCase().includes(search.toLowerCase()) ||
      slot.room.building.name.toLowerCase().includes(search.toLowerCase());

    const matchesDay = !filterDay || slot.dayOfWeek === filterDay;
    const matchesSession = !filterSession || slot.sessionType === filterSession;
    const matchesStatus = !filterStatus || slot.status === filterStatus;
    const matchesRecurrence = !filterRecurrence || slot.recurrencePattern === filterRecurrence;

    return matchesSearch && matchesDay && matchesSession && matchesStatus && matchesRecurrence;
  });

  const errMsg = isError ? ((error as ApiErrorShape).message ?? 'Failed to load timetable slots.') : null;

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle="Course timetable slots and scheduling"
        action={
          role && CREATION_ROLES.has(role) ? (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> New slot
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input type="search" placeholder="Search timetable…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-base flex-1 max-w-sm" aria-label="Search timetable slots" />
        <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} className="input-base max-w-xs">
          <option value="">All days</option>
          {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)} className="input-base max-w-xs">
          <option value="">All session types</option>
          {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-base max-w-xs">
          <option value="">All statuses</option>
          {SLOT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterRecurrence} onChange={(e) => setFilterRecurrence(e.target.value)} className="input-base max-w-xs">
          <option value="">All recurrences</option>
          {RECURRENCE_PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {errMsg && <ErrorAlert message={errMsg} />}

      {isLoading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={CalendarPlus} title="No timetable slots found" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Course', 'Day', 'Time', 'Weeks', 'Session', 'Room', 'Instructor', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((slot) => (
                <tr key={slot.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium">
                    <div className="font-mono text-xs font-bold">{slot.courseOffering.course.code}</div>
                    <div className="text-slate-600 dark:text-slate-400">{slot.courseOffering.course.title}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{slot.dayOfWeek}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {slot.startTime} – {slot.endTime}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {slot.startWeek}–{slot.endWeek}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{slot.sessionType}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {slot.room.building.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {slot.instructor ? (
                      <span>{slot.instructor.user.firstName} {slot.instructor.user.lastName}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={slot.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <CreateSlotModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
