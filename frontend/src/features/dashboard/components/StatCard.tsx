import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
}

export function StatCard({ label, value, sub, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}
