import { useQuery } from '@tanstack/react-query';
import { BookOpen, ClipboardList, Clock } from 'lucide-react';
import { dashboardApi } from '@/services/api/client';
import { StatCard, StatCardSkeleton } from './StatCard';
import type { InstructorDashboard } from '@/types/api';

interface Props {
  instructorId: string;
}

export function InstructorOverview({ instructorId }: Props) {
  const { data, isLoading, isError, error } = useQuery<InstructorDashboard>({
    queryKey: ['dashboard', 'instructor', instructorId],
    queryFn: () => dashboardApi.instructor(instructorId).then((r) => r.data),
    staleTime: 30_000,
    retry: 1,
  });

  const errMsg = isError
    ? ((error as { message?: string })?.message ?? 'Could not load instructor dashboard.')
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

  return (
    <div className="space-y-6">
      {/* Current semester */}
      {!isLoading && data?.currentSemester && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
            Current semester
          </p>
          <p className="mt-0.5 font-semibold">{data.currentSemester.name}</p>
        </div>
      )}

      {/* Pending actions */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Action required
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Grades to submit"
                value={data?.actions.pendingGradesToSubmit ?? 0}
                icon={ClipboardList}
              />
              <StatCard
                label="Excuses to review"
                value={data?.actions.pendingExcusesToReview ?? 0}
                icon={Clock}
              />
            </>
          )}
        </div>
      </div>

      {/* Current offerings */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Current offerings
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : data?.offerings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            No active offerings for the current semester.
          </div>
        ) : (
          <div className="space-y-3">
            {data?.offerings.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <div>
                    <p className="font-medium leading-none">{o.courseCode}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{o.courseTitle}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{o.sectionCode}</span>
                  <span>
                    {o.enrolledCount}/{o.maxCapacity} enrolled
                  </span>
                  {o.room && <span>{o.room}</span>}
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                      o.status === 'OPEN'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {o.status}
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
