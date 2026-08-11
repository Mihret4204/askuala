import {
  BookOpen,
  Building2,
  CalendarDays,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  Users,
  UserSquare2,
  ListTodo,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/api';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
  /** Roles that can see this nav item. Empty = all authenticated roles. */
  roles: UserRole[];
}

// ---------------------------------------------------------------------------
// Roles that can access each nav item.
// Derived from the backend RolesGuard decorators on each controller.
// ---------------------------------------------------------------------------
const ALL_ROLES: UserRole[] = [
  'ADMIN', 'REGISTRAR', 'FACULTY_DEAN', 'HOD', 'INSTRUCTOR', 'STUDENT',
];

//const ADMIN_ROLES: UserRole[] = ['ADMIN', 'REGISTRAR', 'FACULTY_DEAN'];
const STAFF_ROLES: UserRole[] = ['ADMIN', 'REGISTRAR', 'FACULTY_DEAN', 'HOD', 'INSTRUCTOR'];

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    end: true,
    roles: ALL_ROLES,
  },
  {
    // GET /courses — @Public so all logged-in users can read
    to: '/dashboard/courses',
    label: 'Courses',
    icon: BookOpen,
    end: false,
    roles: ALL_ROLES,
  },
  {
    // GET /academic-structure/departments — all authenticated (no @Roles restriction on GET)
    to: '/dashboard/departments',
    label: 'Departments',
    icon: Building2,
    end: false,
    roles: STAFF_ROLES,
  },
  {
    // GET /programs — all authenticated (no @Roles restriction on GET)
    to: '/dashboard/programs',
    label: 'Programs',
    icon: GraduationCap,
    end: false,
    roles: ALL_ROLES,
  },
  {
    // GET /programs/students — restricted to STAFF roles
    to: '/dashboard/students',
    label: 'Students',
    icon: UserSquare2,
    end: false,
    roles: STAFF_ROLES,
  },
  {
    // GET /academic-calendar/years and /academic-calendar/semesters — public read access, mutation restricted by backend
    to: '/dashboard/calendar',
    label: 'Calendar',
    icon: CalendarDays,
    end: false,
    roles: ALL_ROLES,
  },
  {
    // GET /infrastructure/buildings — public read access, mutation restricted to ADMIN, REGISTRAR
    to: '/dashboard/buildings',
    label: 'Buildings',
    icon: Building2,
    end: false,
    roles: STAFF_ROLES,
  },
  {
    // GET /infrastructure/rooms — public read access, mutation restricted to ADMIN, REGISTRAR
    to: '/dashboard/rooms',
    label: 'Rooms',
    icon: DoorOpen,
    end: false,
    roles: STAFF_ROLES,
  },
  {
    // GET /course-offerings — public read access, creation restricted to ADMIN, REGISTRAR, HOD
    to: '/dashboard/course-offerings',
    label: 'Course Offerings',
    icon: BookOpen,
    end: false,
    roles: ALL_ROLES,
  },
  {
    // GET /users — restricted to ADMIN, REGISTRAR
    to: '/dashboard/users',
    label: 'Users',
    icon: Users,
    end: false,
    roles: ['ADMIN', 'REGISTRAR'],
  },
  {
    // GET /enrollments — accessible to ADMIN, REGISTRAR, FACULTY_DEAN, HOD, INSTRUCTOR
    to: '/dashboard/enrollments',
    label: 'Enrollments',
    icon: ListTodo,
    end: false,
    roles: ['ADMIN', 'REGISTRAR', 'FACULTY_DEAN', 'HOD', 'INSTRUCTOR'],
  },
];

/** Filter the nav items to only those the current user role can see. */
export function getNavItemsForRole(role: UserRole | undefined): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter(
    (item) => item.roles.length === 0 || item.roles.includes(role),
  );
}