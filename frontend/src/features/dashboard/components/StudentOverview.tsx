import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, XCircle } from 'lucide-react';
import { dashboardApi } from '@/services/api/client';
import { StatCard, StatCardSkeleton } from './StatCard';
import type { StudentDashboard } from '@/types/api';

interface Props {
  studentId: string;
}

export function StudentOverview({ studentId }: Props) {
  const { data, isLoading, isError, error } = useQuery<StudentDashboard | null>({
    queryKey: ['dashboard', 'student', studentId],
    queryFn: () => dashboardApi.student(studentId).then((r) => r.data),
    staleTime: 30_000,
    retry: 1,
  });

  const errMsg = isError
    ? ((error as { message?: string })?.message ?? 'Could not load student dashboard.')
    : null;

  if (errMsg) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
      >
        {errMsg}
      </div>
    );
  }

  // Backend returns null when the profile isn't found
  if (!isLoading && data === null) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-6 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
        Student profile not found. Contact the registrar if this is unexpected.
      </div>
    );
  }

  const att = data?.attendance;
  const attendancePct = att?.attendancePercentage ?? 100;
  const attendancePctStr = `${attendancePct.toFixed(1)}%`;
  const attendanceColour =
    attendancePct >= 75
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400';

  return (
    <div className="space-y-6">
      {/* Student info banner */}
      {!isLoading && data && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                Student
              </p>
              <p className="mt-0.5 font-semibold">{data.student.fullName}</p>
              <p className="text-sm text-slate-500">
                {data.student.studentIdNumber} · {data.student.program}
              </p>
            </div>
            {data.currentSemester && (
              <div className="text-right text-xs text-slate-500">
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {data.currentSemester.name}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Enrolled courses"
              value={data?.enrollments.length ?? 0}
              icon={BookOpen}
            />
            <StatCard
              label="Attendance"
              value={attendancePctStr}
              sub={`${att?.totalRecords ?? 0} sessions recorded`}
            />
            <StatCard
              label="Published grades"
              value={data?.grades.publishedGradesCount ?? 0}
              icon={CheckCircle2}
            />
          </>
        )}
      </div>

      {/* Attendance breakdown */}
      {!isLoading && att && att.totalRecords > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Attendance breakdown
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            {[
              { label: 'Present', value: att.PRESENT, ok: true },
              { label: 'Late', value: att.LATE, ok: true },
              { label: 'Excused', value: att.EXCUSED, ok: true },
              { label: 'Absent', value: att.ABSENT, ok: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                {item.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden="true" />
                )}
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {item.label}
                </span>
                <span className="ml-auto text-sm font-semibold tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(attendancePct, 100)}%` }}
                role="progressbar"
                aria-valuenow={attendancePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Attendance ${attendancePctStr}`}
              />
            </div>
            <span className={`text-sm font-semibold tabular-nums ${attendanceColour}`}>
              {attendancePctStr}
            </span>
          </div>
        </div>
      )}

      {/* Current enrollments */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Current enrollments
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : data?.enrollments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            No active enrollments for the current semester.
          </div>
        ) : (
          <div className="space-y-3">
            {data?.enrollments.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <div>
                    <p className="font-medium leading-none">{e.courseCode}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{e.courseTitle}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{e.creditHours} cr</span>
                  {e.instructor && <span>{e.instructor}</span>}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium dark:bg-slate-800">
                    {e.enrollmentType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
