import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function RootRedirect() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  // Wait for Zustand persist to rehydrate before deciding where to send the user.
  if (!isHydrated) {
    return null;
  }

  return isAuthenticated
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/login" replace />;
}
