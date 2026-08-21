const colours: Record<string, string> = {
  ACTIVE:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  INACTIVE: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  SUSPENDED:'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  ARCHIVED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colours[status] ?? colours.INACTIVE}`}
    >
      {status}
    </span>
  );
}
