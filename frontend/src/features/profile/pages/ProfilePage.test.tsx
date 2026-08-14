/**
 * ProfilePage tests.
 *
 * Tests cover:
 *  - profile data rendering
 *  - loading state
 *  - API error with store fallback
 *  - sign out clears auth and redirects to /login
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from './ProfilePage';
import { authApi } from '@/services/api/client';
import type { UserSummary } from '@/types/api';

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

const {
  getStoreUser,
  setStoreUser,
  clearAuthMock,
  navigateMock,
  useAuthStoreMock,
} = vi.hoisted(() => {
  let storeUser: UserSummary | null = null;

  const clearAuthMock = vi.fn();
  const navigateMock = vi.fn();

  const useAuthStoreMock = vi.fn(
    (
      selector: (state: {
        user: UserSummary | null;
        clearAuth: () => void;
      }) => unknown,
    ) =>
      selector({
        user: storeUser,
        clearAuth: clearAuthMock,
      }),
  );

  return {
    getStoreUser: () => storeUser,
    setStoreUser: (user: UserSummary | null) => {
      storeUser = user;
    },
    clearAuthMock,
    navigateMock,
    useAuthStoreMock,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/services/api/client', () => ({
  authApi: {
    me: vi.fn(),
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeUser: UserSummary = {
  id: 'user-1',
  email: 'alice@uni.edu',
  firstName: 'Alice',
  lastName: 'Smith',
  role: 'ADMIN',
  status: 'ACTIVE',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setStoreUser(null);
  clearAuthMock.mockReset();
  navigateMock.mockReset();
  useAuthStoreMock.mockClear();
  vi.mocked(authApi.me).mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProfilePage', () => {
  it('renders profile data from API response', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      data: fakeUser,
    } as Awaited<ReturnType<typeof authApi.me>>);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('alice@uni.edu')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('user-1')).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    vi.mocked(authApi.me).mockReturnValueOnce(
      new Promise(() => {}) as ReturnType<typeof authApi.me>,
    );

    renderPage();

    expect(screen.getByText('Refreshing profile…')).toBeInTheDocument();
  });

  it('falls back to store user on API error', async () => {
    setStoreUser(fakeUser);
    vi.mocked(authApi.me).mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText('Could not refresh profile. Showing cached data.'),
      ).toBeInTheDocument();
    });
  });

  it('sign out clears auth and redirects to /login', async () => {
    setStoreUser(fakeUser);

    vi.mocked(authApi.me).mockResolvedValue({
      data: fakeUser,
    } as Awaited<ReturnType<typeof authApi.me>>);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    expect(clearAuthMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/login', {
      replace: true,
    });
  });
});