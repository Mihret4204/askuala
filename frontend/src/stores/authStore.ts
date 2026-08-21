import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, UserSummary } from '@/types/api';

interface AuthStore extends AuthState {
  setAuth: (user: UserSummary | null, accessToken: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: false,

      setAuth: (user, accessToken) => {
        if (typeof window !== 'undefined') {
          if (accessToken) {
            window.localStorage.setItem('accessToken', accessToken);
          } else {
            window.localStorage.removeItem('accessToken');
          }
        }
        set({
          user,
          accessToken,
          isAuthenticated: Boolean(user && accessToken),
          isHydrated: true,
        });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('accessToken');
        }
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isHydrated: true,
        });
      },
    }),
    {
      name: 'sis-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Called after Zustand finishes reading from localStorage.
        // Mark store as hydrated so ProtectedRoute can render correctly.
        if (state) {
          state.isHydrated = true;
        }
      },
    },
  ),
);
