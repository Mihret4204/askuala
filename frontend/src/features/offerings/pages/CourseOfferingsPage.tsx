import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Plus } from 'lucide-react';
import { courseOfferingsApi, coursesApi, academicCalendarApi, instructorsApi, roomsApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import type { CourseOfferingRecord, CreateCourseOfferingPayload, ApiErrorShape, DeliveryMode, CourseOfferingStatus } from '@/types/api';

const WRITABLE_ROLES = new Set(['ADMIN', 'REGISTRAR', 'HOD']);

const DELIVERY_MODES: DeliveryMode[] = ['REGULAR', 'EXTENSION', 'DISTANCE'];
const STATUSES: CourseOfferingStatus[] = ['PLANNED', 'OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED'];

const schema = z.object({
  courseId: z.string().uuid('Select a course.'),
  semesterId: z.string().uuid('Select a semester.'),
  instructorId: z.string().optional(),
  roomId: z.string().optional(),
  sectionCode: z.string().min(1, 'Section code is required.'),
  deliveryMode: z.enum(['REGULAR', 'EXTENSION', 'DISTANCE']).optional(),
  maxCapacity: z.string().refine(
    (val) => Number.isInteger(Number(val)) && Number(val) >= 1,
    'Capacity must be at least 1.',
  ),
  status: z.enum(['PLANNED', 'OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED']).optional(),
  syllabusUrl: z.string().url('Invalid URL').optional(),
});

interface FormData {
  courseId: string;
  semesterId: string;
  instructorId?: string;
  roomId?: string;
  sectionCode: string;
  deliveryMode?: DeliveryMode;
  maxCapacity: string;
  status?: CourseOfferingStatus;
  syllabusUrl?: string;
}

function CreateCourseOfferingModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: semesters = [] } = useQuery({
    queryKey: ['semesters'],
    queryFn: () => academicCalendarApi.listSemesters().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['instructors'],
    queryFn: () => instructorsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (p: CreateCourseOfferingPayload) => courseOfferingsApi.create(p).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courseOfferings'] }); onClose(); },
    onError: (e: ApiErrorShape) => {
      if (e.status === 409) {
        setApiError('Course offering for this section already exists in this semester.');
      } else if (e.status === 404) {
        setApiError('Course, semester, instructor, or room not found.');
      } else {
        setApiError(e.message ?? 'Failed to create course offering.');
      }
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (v: FormData) => {
    setApiError(null);
    const payload: CreateCourseOfferingPayload = {
      courseId: v.courseId,
      semesterId: v.semesterId,
      instructorId: v.instructorId || undefined,
      roomId: v.roomId || undefined,
      sectionCode: v.sectionCode.toUpperCase(),
      deliveryMode: v.deliveryMode,
      maxCapacity: parseInt(v.maxCapacity, 10),
      status: v.status,
      syllabusUrl: v.syllabusUrl || undefined,
    };
    mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold">Create course offering</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="co-course">Course</label>
              <select id="co-course" className="input-base" {...register('courseId')}>
                <option value="">Select course…</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </select>
              {errors.courseId && <p className="err">{errors.courseId.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="co-semester">Semester</label>
              <select id="co-semester" className="input-base" {...register('semesterId')}>
                <option value="">Select semester…</option>
                {semesters.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
              {errors.semesterId && <p className="err">{errors.semesterId.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="co-section">Section Code</label>
              <input id="co-section" className="input-base" placeholder="e.g., A01" {...register('sectionCode')} />
              {errors.sectionCode && <p className="err">{errors.sectionCode.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="co-mode">Delivery Mode (optional)</label>
              <select id="co-mode" className="input-base" {...register('deliveryMode')}>
                <option value="">Regular</option>
                {DELIVERY_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="co-capacity">Max Capacity</label>
              <input id="co-capacity" type="number" className="input-base" placeholder="e.g., 50" {...register('maxCapacity')} />
              {errors.maxCapacity && <p className="err">{errors.maxCapacity.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="co-status">Status (optional)</label>
              <select id="co-status" className="input-base" {...register('status')}>
                <option value="">Planned</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="co-instructor">Instructor (optional)</label>
              <select id="co-instructor" className="input-base" {...register('instructorId')}>
                <option value="">None</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.user.firstName} {i.user.lastName} — {i.department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="co-room">Room (optional)</label>
              <select id="co-room" className="input-base" {...register('roomId')}>
                <option value="">None</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} — {r.building.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm" htmlFor="co-syllabus">Syllabus URL (optional)</label>
            <input id="co-syllabus" type="url" className="input-base" placeholder="https://..." {...register('syllabusUrl')} />
            {errors.syllabusUrl && <p className="err">{errors.syllabusUrl.message}</p>}
          </div>

          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating…' : 'Create offering'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CourseOfferingsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDelivery, setFilterDelivery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const { data, isLoading, isError, error } = useQuery<CourseOfferingRecord[]>({
    queryKey: ['courseOfferings'],
    queryFn: () => courseOfferingsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter((o) => {
    const matchesSearch = !search ||
      o.course.code.toLowerCase().includes(search.toLowerCase()) ||
      o.course.title.toLowerCase().includes(search.toLowerCase()) ||
      o.sectionCode.toLowerCase().includes(search.toLowerCase()) ||
      o.instructor?.user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      o.instructor?.user.lastName.toLowerCase().includes(search.toLowerCase());

    const matchesDelivery = !filterDelivery || o.deliveryMode === filterDelivery;
    const matchesStatus = !filterStatus || o.status === filterStatus;

    return matchesSearch && matchesDelivery && matchesStatus;
  });

  const errMsg = isError ? ((error as ApiErrorShape).message ?? 'Failed to load course offerings.') : null;

  return (
    <div>
      <PageHeader
        title="Course Offerings"
        subtitle="Course sections available for enrollment"
        action={
          role && WRITABLE_ROLES.has(role) ? (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> New offering
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input type="search" placeholder="Search offerings…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-base flex-1 max-w-sm" aria-label="Search course offerings" />
        <select value={filterDelivery} onChange={(e) => setFilterDelivery(e.target.value)} className="input-base max-w-xs">
          <option value="">All delivery modes</option>
          {DELIVERY_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-base max-w-xs">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {errMsg && <ErrorAlert message={errMsg} />}

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No course offerings found" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Course', 'Section', 'Semester', 'Delivery', 'Instructor', 'Room', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium">
                    <div className="font-mono text-xs font-bold">{o.course.code}</div>
                    <div className="text-slate-600 dark:text-slate-400">{o.course.title}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{o.sectionCode}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{o.semester.code}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{o.deliveryMode}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {o.instructor ? `${o.instructor.user.firstName} ${o.instructor.user.lastName}` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {o.room ? `${o.room.code} (${o.room.building.name})` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && <CreateCourseOfferingModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
