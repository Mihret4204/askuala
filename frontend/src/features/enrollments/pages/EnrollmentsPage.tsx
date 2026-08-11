import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Plus } from 'lucide-react';
import { enrollmentsApi, studentsApi, courseOfferingsApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import type { 
  EnrollmentRecord, 
  CreateEnrollmentPayload, 
  UpdateEnrollmentStatusPayload,
  ApiErrorShape,
  EnrollmentTypeEnum,
  EnrollmentStatusEnum
} from '@/types/api';

const CREATION_ROLES = new Set(['ADMIN', 'REGISTRAR', 'STUDENT']);
const UPDATE_STATUS_ROLES = new Set(['ADMIN', 'REGISTRAR']);

const ENROLLMENT_TYPES: EnrollmentTypeEnum[] = ['CREDIT', 'AUDIT'];
const ENROLLMENT_STATUSES: EnrollmentStatusEnum[] = ['ENROLLED', 'DROPPED', 'WITHDRAWN', 'COMPLETED', 'FAILED'];

const createSchema = z.object({
  studentId: z.string().uuid('Select a student.'),
  courseOfferingId: z.string().uuid('Select a course offering.'),
  enrollmentType: z.enum(['CREDIT', 'AUDIT']).optional(),
});

interface CreateFormData {
  studentId: string;
  courseOfferingId: string;
  enrollmentType?: EnrollmentTypeEnum;
}

const updateStatusSchema = z.object({
  status: z.enum(['ENROLLED', 'DROPPED', 'WITHDRAWN', 'COMPLETED', 'FAILED']),
});

interface UpdateStatusFormData {
  status: EnrollmentStatusEnum;
}

function CreateEnrollmentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: courseOfferings = [] } = useQuery({
    queryKey: ['courseOfferings'],
    queryFn: () => courseOfferingsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (p: CreateEnrollmentPayload) => enrollmentsApi.create(p).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enrollments'] }); onClose(); },
    onError: (e: ApiErrorShape) => {
      if (e.status === 404) {
        setApiError('Student or course offering not found.');
      } else if (e.status === 409) {
        setApiError('Student is already actively enrolled in this course section.');
      } else if (e.status === 400) {
        setApiError('Cannot enroll in a cancelled or completed course offering.');
      } else {
        setApiError(e.message ?? 'Failed to create enrollment.');
      }
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
  });

  const onSubmit = (v: CreateFormData) => {
    setApiError(null);
    const payload: CreateEnrollmentPayload = {
      studentId: v.studentId,
      courseOfferingId: v.courseOfferingId,
      enrollmentType: v.enrollmentType,
    };
    mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold">Create enrollment</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="en-student">Student</label>
              <select id="en-student" className="input-base" {...register('studentId')}>
                <option value="">Select student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.studentIdNumber} — {s.user.firstName} {s.user.lastName}
                  </option>
                ))}
              </select>
              {errors.studentId && <p className="err">{errors.studentId.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="en-course-offering">Course Offering</label>
              <select id="en-course-offering" className="input-base" {...register('courseOfferingId')}>
                <option value="">Select course offering…</option>
                {courseOfferings.filter(co => co.status !== 'CANCELLED' && co.status !== 'COMPLETED').map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.course.code} — {co.sectionCode} — {co.semester.code}
                  </option>
                ))}
              </select>
              {errors.courseOfferingId && <p className="err">{errors.courseOfferingId.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm" htmlFor="en-type">Enrollment Type (optional)</label>
            <select id="en-type" className="input-base" {...register('enrollmentType')}>
              <option value="">Credit (default)</option>
              {ENROLLMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Creating…' : 'Create enrollment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UpdateEnrollmentStatusModal({ 
  enrollment, 
  onClose 
}: { 
  enrollment: EnrollmentRecord; 
  onClose: () => void 
}) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (p: UpdateEnrollmentStatusPayload) => 
      enrollmentsApi.updateStatus(enrollment.id, p).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['enrollments'] }); onClose(); },
    onError: (e: ApiErrorShape) => {
      setApiError(e.message ?? 'Failed to update enrollment status.');
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<UpdateStatusFormData>({
    resolver: zodResolver(updateStatusSchema),
  });

  const onSubmit = (v: UpdateStatusFormData) => {
    setApiError(null);
    const payload: UpdateEnrollmentStatusPayload = {
      status: v.status,
    };
    mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold">Update enrollment status</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Student: {enrollment.student.user.firstName} {enrollment.student.user.lastName}<br />
          Course: {enrollment.courseOffering.course.code} — {enrollment.courseOffering.sectionCode}<br />
          Current status: <StatusBadge status={enrollment.status} />
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-sm" htmlFor="en-status">New Status</label>
            <select id="en-status" className="input-base" {...register('status')}>
              <option value="">Select new status…</option>
              {ENROLLMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.status && <p className="err">{errors.status.message}</p>}
          </div>

          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? 'Updating…' : 'Update status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EnrollmentsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [enrollmentToUpdate, setEnrollmentToUpdate] = useState<EnrollmentRecord | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const { data, isLoading, isError, error } = useQuery<EnrollmentRecord[]>({
    queryKey: ['enrollments'],
    queryFn: () => enrollmentsApi.list().then((r) => r.data),
    staleTime: 30_000,
  });

  const filtered = (data ?? []).filter((e) => {
    const matchesSearch = !search ||
      e.student.user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      e.student.user.lastName.toLowerCase().includes(search.toLowerCase()) ||
      e.student.studentIdNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.courseOffering.course.code.toLowerCase().includes(search.toLowerCase()) ||
      e.courseOffering.course.title.toLowerCase().includes(search.toLowerCase()) ||
      e.courseOffering.sectionCode.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !filterStatus || e.status === filterStatus;
    const matchesType = !filterType || e.enrollmentType === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const errMsg = isError ? ((error as ApiErrorShape).message ?? 'Failed to load enrollments.') : null;

  return (
    <div>
      <PageHeader
        title="Enrollments"
        subtitle="Student course registrations and status"
        action={
          role && CREATION_ROLES.has(role) ? (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" aria-hidden="true" /> New enrollment
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input type="search" placeholder="Search enrollments…" value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-base flex-1 max-w-sm" aria-label="Search enrollments" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-base max-w-xs">
          <option value="">All statuses</option>
          {ENROLLMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input-base max-w-xs">
          <option value="">All enrollment types</option>
          {ENROLLMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {errMsg && <ErrorAlert message={errMsg} />}

      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No enrollments found" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Student ID', 'Student Name', 'Course', 'Section', 'Semester', 'Type', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium">{e.student.studentIdNumber}</td>
                  <td className="px-4 py-3 font-medium">
                    <div>{e.student.user.firstName} {e.student.user.lastName}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {e.student.program.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-bold">{e.courseOffering.course.code}</div>
                    <div className="text-slate-600 dark:text-slate-400">{e.courseOffering.course.title}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{e.courseOffering.sectionCode}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{e.courseOffering.semester.code}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{e.enrollmentType}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={e.status} />
                      {role && UPDATE_STATUS_ROLES.has(role) && e.status !== 'COMPLETED' && e.status !== 'FAILED' && (
                        <button
                          onClick={() => setEnrollmentToUpdate(e)}
                          className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                        >
                          Update
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showCreateModal && <CreateEnrollmentModal onClose={() => setShowCreateModal(false)} />}
      {enrollmentToUpdate && (
        <UpdateEnrollmentStatusModal 
          enrollment={enrollmentToUpdate} 
          onClose={() => setEnrollmentToUpdate(null)} 
        />
      )}
    </div>
  );
}