import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/services/api/client';
import apiClient from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { AdminOverview } from '../components/AdminOverview';
import { InstructorOverview } from '../components/InstructorOverview';
import { StudentOverview } from '../components/StudentOverview';
import type { UserSummary } from '@/types/api';

// Roles that see the system-wide admin overview
const ADMIN_ROLES = new Set(['ADMIN', 'REGISTRAR', 'FACULTY_DEAN']);

export function DashboardPage() {
  const storeUser = useAuthStore((s) => s.user);

  // Refresh the user from the server to pick up any profile changes.
  const { data: liveUser, isLoading } = useQuery<UserSummary>({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().then((r) => r.data),
    retry: false,
    staleTime: 60_000,
  });

  const user = liveUser ?? storeUser;

  // Welcome heading
  const heading = isLoading
    ? null
    : `Welcome back, ${user?.firstName ?? 'there'}.`;

  // Role-specific sub-description
  const subText: Record<string, string> = {
    ADMIN: 'Here is your system overview.',
    REGISTRAR: 'Here is your system overview.',
    FACULTY_DEAN: 'Here is your faculty overview.',
    HOD: 'Here is your department overview.',
    INSTRUCTOR: 'Here are your current offerings and pending actions.',
    STUDENT: 'Here are your current enrollments and attendance.',
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Dashboard</p>
        {isLoading ? (
          <div className="mt-2 h-8 w-56 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ) : (
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{heading}</h1>
        )}
        {user?.role && (
          <p className="mt-1 text-sm text-slate-500">
            {subText[user.role] ?? 'Your SIS workspace is ready.'}
          </p>
        )}
      </div>

      {/* Role-specific content */}
      {isLoading ? (
        // Generic skeleton while user role is unknown
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : ADMIN_ROLES.has(user?.role ?? '') ? (
        <AdminOverview />
      ) : user?.role === 'INSTRUCTOR' || user?.role === 'HOD' ? (
        // HOD and INSTRUCTOR both see the instructor-style dashboard.
        // The instructorId comes from the user's instructor profile.
        // We use user.id here as a fallback since we don't store the
        // instructor profile ID in the auth store. In practice the
        // backend resolves the correct profile for staff roles.
        // NOTE: The backend endpoint GET /dashboard/instructor/:instructorId
        // expects the instructor PROFILE id, not the user id. When the
        // student profile or instructor profile lookup returns null the
        // backend returns null and the component shows an appropriate message.
        <InstructorDashboardWithLookup userId={user?.id ?? ''} role={user?.role ?? 'INSTRUCTOR'} />
      ) : user?.role === 'STUDENT' ? (
        <StudentDashboardWithLookup userId={user?.id ?? ''} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers that resolve the profile ID before calling the dashboard endpoint.
// The auth store only holds the user ID; the dashboard endpoints need the
// profile (student/instructor) ID. We call /programs/students or /academic-
// structure/instructors to find the matching profile.
// ---------------------------------------------------------------------------

interface InstructorDashboardProps {
  userId: string;
  role: string;
}

function InstructorDashboardWithLookup({ userId }: InstructorDashboardProps) {
  // GET /academic-structure/instructors — all authenticated (no @Roles guard on GET)
  const { data, isLoading, isError } = useQuery<{ id: string; userId: string }[]>({
    queryKey: ['instructors', 'list'],
    queryFn: async () => {
      return apiClient
        .get<{ id: string; userId: string }[]>('/academic-structure/instructors')
        .then((r) => r.data);
    },
    staleTime: 60_000,
    retry: 1,
    enabled: Boolean(userId),
  });

  const instructorProfile = data?.find((i) => i.userId === userId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (isError || !instructorProfile) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-6 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
        Instructor profile not found. Contact the registrar if this is unexpected.
      </div>
    );
  }

  return <InstructorOverview instructorId={instructorProfile.id} />;
}

function StudentDashboardWithLookup({ userId }: { userId: string }) {
  // GET /programs/students — all authenticated roles can read their own profile
  const { data, isLoading, isError } = useQuery<{ id: string; userId: string }[]>({
    queryKey: ['students', 'list'],
    queryFn: async () => {
      return apiClient
        .get<{ id: string; userId: string }[]>('/programs/students')
        .then((r) => r.data);
    },
    staleTime: 60_000,
    retry: 1,
    enabled: Boolean(userId),
  });

  const studentProfile = data?.find((s) => s.userId === userId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (isError || !studentProfile) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-6 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
        Student profile not found. Contact the registrar if this is unexpected.
      </div>
    );
  }

  return <StudentOverview studentId={studentProfile.id} />;
}
