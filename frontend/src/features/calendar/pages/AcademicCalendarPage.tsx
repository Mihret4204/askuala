import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarDays, Plus, School, Sparkles, BookOpenCheck } from 'lucide-react';
import { academicCalendarApi } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import type { AcademicYearRecord, SemesterRecord, CreateAcademicYearPayload, CreateSemesterPayload, ApiErrorShape } from '@/types/api';

const WRITABLE_ROLES = new Set(['ADMIN', 'REGISTRAR']);

const yearSchema = z.object({
  yearCode: z.string().min(1, 'Year code is required.'),
  title: z.string().min(2, 'Title is required.'),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
  isCurrent: z.boolean().optional(),
  status: z.string().optional(),
});

type YearFormValues = z.infer<typeof yearSchema>;

const semesterSchema = z.object({
  academicYearId: z.string().uuid('Select an academic year.'),
  code: z.string().min(1, 'Code is required.'),
  name: z.string().min(2, 'Name is required.'),
  termType: z.string().min(1, 'Term type is required.'),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
  registrationStartDate: z.string().optional(),
  registrationEndDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
  status: z.string().optional(),
});

type SemesterFormValues = z.infer<typeof semesterSchema>;

function CreateYearModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateAcademicYearPayload) => academicCalendarApi.createYear(payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-calendar-years'] });
      onClose();
    },
    onError: (e: ApiErrorShape) => setApiError(e.status === 409 ? 'Academic year code already exists.' : (e.message ?? 'Failed to create academic year.')),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<YearFormValues>({ resolver: zodResolver(yearSchema) });

  const onSubmit = (v: YearFormValues) => {
    setApiError(null);
    mutate({
      yearCode: v.yearCode,
      title: v.title,
      startDate: v.startDate,
      endDate: v.endDate,
      isCurrent: v.isCurrent ?? false,
      status: v.status ?? 'PLANNED',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Create academic year</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="year-code">Year code</label>
              <input id="year-code" className="input-base" placeholder="2026/2027" {...register('yearCode')} />
              {errors.yearCode && <p className="err">{errors.yearCode.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="year-title">Title</label>
              <input id="year-title" className="input-base" placeholder="Academic Year 2026-2027" {...register('title')} />
              {errors.title && <p className="err">{errors.title.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="year-start">Start date</label>
              <input id="year-start" type="date" className="input-base" {...register('startDate')} />
              {errors.startDate && <p className="err">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="year-end">End date</label>
              <input id="year-end" type="date" className="input-base" {...register('endDate')} />
              {errors.endDate && <p className="err">{errors.endDate.message}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="year-current" type="checkbox" {...register('isCurrent')} />
            <label htmlFor="year-current" className="text-sm">Set as current academic year</label>
          </div>
          <div>
            <label className="mb-1 block text-sm" htmlFor="year-status">Status</label>
            <select id="year-status" className="input-base" {...register('status')}>
              <option value="PLANNED">PLANNED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">{isPending ? 'Creating…' : 'Create academic year'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateSemesterModal({ years, onClose }: { years: AcademicYearRecord[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateSemesterPayload) => academicCalendarApi.createSemester(payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-calendar-semesters'] });
      onClose();
    },
    onError: (e: ApiErrorShape) => setApiError(e.status === 409 ? 'Semester code already exists.' : (e.message ?? 'Failed to create semester.')),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<SemesterFormValues>({ resolver: zodResolver(semesterSchema) });

  const onSubmit = (v: SemesterFormValues) => {
    setApiError(null);
    mutate({
      academicYearId: v.academicYearId,
      code: v.code,
      name: v.name,
      termType: v.termType,
      startDate: v.startDate,
      endDate: v.endDate,
      registrationStartDate: v.registrationStartDate || undefined,
      registrationEndDate: v.registrationEndDate || undefined,
      isCurrent: v.isCurrent ?? false,
      status: v.status ?? 'PLANNED',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Create semester</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-sm" htmlFor="sem-year">Academic year</label>
            <select id="sem-year" className="input-base" {...register('academicYearId')}>
              <option value="">Select academic year…</option>
              {years.map((year) => <option key={year.id} value={year.id}>{year.title}</option>)}
            </select>
            {errors.academicYearId && <p className="err">{errors.academicYearId.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="sem-code">Code</label>
              <input id="sem-code" className="input-base" placeholder="FALL2026" {...register('code')} />
              {errors.code && <p className="err">{errors.code.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="sem-name">Name</label>
              <input id="sem-name" className="input-base" placeholder="Fall 2026" {...register('name')} />
              {errors.name && <p className="err">{errors.name.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="sem-term">Term type</label>
              <select id="sem-term" className="input-base" {...register('termType')}>
                <option value="">Select term…</option>
                <option value="SEMESTER_1">SEMESTER_1</option>
                <option value="SEMESTER_2">SEMESTER_2</option>
                <option value="TRIMESTER_1">TRIMESTER_1</option>
                <option value="TRIMESTER_2">TRIMESTER_2</option>
                <option value="TRIMESTER_3">TRIMESTER_3</option>
                <option value="SUMMER">SUMMER</option>
              </select>
              {errors.termType && <p className="err">{errors.termType.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="sem-status">Status</label>
              <select id="sem-status" className="input-base" {...register('status')}>
                <option value="PLANNED">PLANNED</option>
                <option value="REGISTRATION">REGISTRATION</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="EXAM_PERIOD">EXAM_PERIOD</option>
                <option value="GRADING">GRADING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="sem-start">Start date</label>
              <input id="sem-start" type="date" className="input-base" {...register('startDate')} />
              {errors.startDate && <p className="err">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="sem-end">End date</label>
              <input id="sem-end" type="date" className="input-base" {...register('endDate')} />
              {errors.endDate && <p className="err">{errors.endDate.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm" htmlFor="reg-start">Registration start</label>
              <input id="reg-start" type="date" className="input-base" {...register('registrationStartDate')} />
            </div>
            <div>
              <label className="mb-1 block text-sm" htmlFor="reg-end">Registration end</label>
              <input id="reg-end" type="date" className="input-base" {...register('registrationEndDate')} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id="sem-current" type="checkbox" {...register('isCurrent')} />
            <label htmlFor="sem-current" className="text-sm">Set as current semester</label>
          </div>
          {apiError && <ErrorAlert message={apiError} />}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary">{isPending ? 'Creating…' : 'Create semester'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function AcademicCalendarPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [showYearModal, setShowYearModal] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data: years = [], isLoading: yearsLoading, isError: yearsError, error: yearsErrorData } = useQuery<AcademicYearRecord[]>({
    queryKey: ['academic-calendar-years'],
    queryFn: () => academicCalendarApi.listYears().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: semesters = [], isLoading: semestersLoading, isError: semestersError, error: semestersErrorData } = useQuery<SemesterRecord[]>({
    queryKey: ['academic-calendar-semesters'],
    queryFn: () => academicCalendarApi.listSemesters().then((r) => r.data),
    staleTime: 30_000,
  });

  const canWrite = role ? WRITABLE_ROLES.has(role) : false;

  const filteredYears = useMemo(() => {
    const term = search.toLowerCase();
    return years.filter((year) => !term || year.yearCode.toLowerCase().includes(term) || year.title.toLowerCase().includes(term));
  }, [years, search]);

  const filteredSemesters = useMemo(() => {
    const term = search.toLowerCase();
    return semesters.filter((semester) => !term || semester.code.toLowerCase().includes(term) || semester.name.toLowerCase().includes(term));
  }, [semesters, search]);

  const currentYear = years.find((y) => y.isCurrent) ?? null;
  const currentSemester = semesters.find((s) => s.isCurrent) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic calendar"
        subtitle="Manage academic years and semesters for the institution"
        action={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowYearModal(true)} className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" /> New academic year
              </button>
              <button onClick={() => setShowSemesterModal(true)} className="btn-ghost flex items-center gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" /> New semester
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input type="search" placeholder="Search academic years or semesters…" value={search} onChange={(e) => setSearch(e.target.value)} className="input-base max-w-md" aria-label="Search academic calendar" />
        {(currentYear || currentSemester) && (
          <div className="flex flex-wrap gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
            {currentYear && <span className="flex items-center gap-1"><Sparkles className="h-4 w-4" /> Current year: {currentYear.yearCode}</span>}
            {currentSemester && <span className="flex items-center gap-1"><BookOpenCheck className="h-4 w-4" /> Current semester: {currentSemester.code}</span>}
          </div>
        )}
      </div>

      {(yearsError || semestersError) && <ErrorAlert message={(yearsError ? ((yearsErrorData as ApiErrorShape).message ?? 'Failed to load academic years.') : '') || (semestersError ? ((semestersErrorData as ApiErrorShape).message ?? 'Failed to load semesters.') : '')} />}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Academic years" description="Manage the institution’s academic year lifecycle">
          {yearsLoading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : filteredYears.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No academic years found" description="Create the first academic year to begin planning." />
          ) : (
            <div className="space-y-3">
              {filteredYears.map((year) => (
                <div key={year.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{year.title}</h3>
                        {year.isCurrent && <StatusBadge status="ACTIVE" />}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{year.yearCode}</p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <div>{new Date(year.startDate).toLocaleDateString()}</div>
                      <div>to {new Date(year.endDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{year.status}</span>
                    <span>{year.semesters.length} semesters</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Semesters" description="Track active and upcoming semesters within each academic year">
          {semestersLoading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : filteredSemesters.length === 0 ? (
            <EmptyState icon={School} title="No semesters found" description="Create a semester and link it to an academic year." />
          ) : (
            <div className="space-y-3">
              {filteredSemesters.map((semester) => (
                <div key={semester.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{semester.name}</h3>
                        {semester.isCurrent && <StatusBadge status="ACTIVE" />}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{semester.code} • {semester.termType}</p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <div>{new Date(semester.startDate).toLocaleDateString()}</div>
                      <div>to {new Date(semester.endDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{semester.status}</span>
                    <span>{semester.academicYear?.title ?? 'Academic year unavailable'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {showYearModal && <CreateYearModal onClose={() => setShowYearModal(false)} />}
      {showSemesterModal && <CreateSemesterModal years={years} onClose={() => setShowSemesterModal(false)} />}
    </div>
  );
}
