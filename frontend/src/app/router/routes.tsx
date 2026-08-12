import { createBrowserRouter, Outlet } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { HomePage } from '@/pages/HomePage';
import { StaffPage } from '@/pages/StaffPage';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { RootRedirect } from '@/app/router/root-redirect';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { AcademicCalendarPage } from '@/features/calendar/pages/AcademicCalendarPage';
import { BuildingsPage } from '@/features/buildings/pages/BuildingsPage';
import { RoomsPage } from '@/features/rooms/pages/RoomsPage';
import { CourseOfferingsPage } from '@/features/offerings/pages/CourseOfferingsPage';
import { EnrollmentsPage } from '@/features/enrollments/pages/EnrollmentsPage';
import { TimetablePage } from '@/features/timetable/pages/TimetablePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      // Root: redirect based on auth state
      { index: true, element: <RootRedirect /> },

      // Public routes (unauthenticated)
      {
        element: <PublicLayout />,
        children: [
          { path: 'home', element: <HomePage /> },
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
        ],
      },

      // Protected routes (require authentication)
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'staff', element: <StaffPage /> },
              { path: 'calendar', element: <AcademicCalendarPage /> },
              { path: 'buildings', element: <BuildingsPage /> },
              { path: 'rooms', element: <RoomsPage /> },
              { path: 'course-offerings', element: <CourseOfferingsPage /> },
              { path: 'enrollments', element: <EnrollmentsPage /> },
              { path: 'timetable', element: <TimetablePage /> },
            ],
          },
        ],
      },
    ],
  },
]);
