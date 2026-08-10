import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';

export function CoursesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: () => apiClient.get('/courses').then((response: { data: unknown }) => response.data),
  });

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">Courses</p>
          <h2 className="mt-1 text-2xl font-semibold">Course catalog</h2>
        </div>
      </div>
      {isLoading ? <p className="mt-6 text-sm text-slate-500">Loading courses…</p> : null}
      {error ? <p className="mt-6 text-sm text-rose-500">Unable to load courses.</p> : null}
      {!isLoading && !error ? (
        <div className="mt-6 grid gap-4">
          {Array.isArray(data) && data.length > 0 ? data.slice(0, 5).map((course: { code: string; title: string; description?: string }) => (
            <div key={course.code} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{course.code}</h3>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Catalog</span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{course.title}</p>
              {course.description ? <p className="mt-2 text-sm text-slate-500">{course.description}</p> : null}
            </div>
          )) : <p className="text-sm text-slate-500">No courses available yet.</p>}
        </div>
      ) : null}
    </div>
  );
}
