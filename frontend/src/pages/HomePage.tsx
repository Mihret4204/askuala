export function HomePage() {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Student Information System</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-50">A structured foundation for academic operations</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          This shell provides routing, shared layouts, auth state, and placeholder modules so the next domain work can be added cleanly.
        </p>
      </div>
    </div>
  );
}
