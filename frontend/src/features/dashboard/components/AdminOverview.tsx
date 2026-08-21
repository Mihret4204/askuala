import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Building2,
  GraduationCap,
  Users,
} from 'lucide-react';
import { dashboardApi } from '@/services/api/client';
import { StatCard, StatCardSkeleton } from './StatCard';
import type { SystemOverview } from '@/types/api';

export function AdminOverview() {
  const { data, isLoading, isError, error } = useQuery<SystemOverview>({
    queryKey: ['dashboard', 'system'],
    queryFn: () => dashboardApi.system().then((r) => r.data),
    staleTime: 30_000,
    retry: 1,
  });

  const errMsg = isError
    ? ((error as { message?: string })?.message ?? 'Could not load system overview.')
    : null;

  return (
    <div className="space-y-6">
      {errMsg && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
        >
          {errMsg}
        </div>
      )}

      {/* Current semester banner */}
      {isLoading ? (
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      ) : data?.currentSemester ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                Current semester
              </p>
              <p className="mt-0.5 font-semibold">
                {data.currentSemester.name}{' '}
                <span className="text-sm font-normal text-slate-500">
                  — {data.currentSemester.academicYear}
                </span>
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              {data.currentSemester.status}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { label: 'Open offerings', value: data.currentSemester.openOfferings },
              { label: 'Active enrollments', value: data.currentSemester.totalEnrollments },
              { label: 'Completed offerings', value: data.currentSemester.completedOfferings },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !isLoading && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
            No active semester is currently configured.
          </div>
        )
      )}

      {/* Institution stats */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Institution
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                label="Faculties"
                value={data?.institution.totalFaculties ?? 0}
                icon={Building2}
              />
              <StatCard
                label="Departments"
                value={data?.institution.totalDepartments ?? 0}
                icon={Building2}
              />
              <StatCard
                label="Programs"
                value={data?.institution.totalPrograms ?? 0}
                icon={GraduationCap}
              />
              <StatCard
                label="Courses"
                value={data?.institution.totalCourses ?? 0}
                icon={BookOpen}
              />
            </>
          )}
        </div>
      </div>

      {/* People stats */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          People
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                label="Total students"
                value={data?.people.totalStudents ?? 0}
                sub={`${data?.people.activeStudents ?? 0} active`}
                icon={Users}
              />
              <StatCard
                label="Active students"
                value={data?.people.activeStudents ?? 0}
                icon={Users}
              />
              <StatCard
                label="Total instructors"
                value={data?.people.totalInstructors ?? 0}
                sub={`${data?.people.activeInstructors ?? 0} active`}
                icon={Users}
              />
              <StatCard
                label="Active instructors"
                value={data?.people.activeInstructors ?? 0}
                icon={Users}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
