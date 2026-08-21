import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EnrollmentsPage } from './EnrollmentsPage';
import { useAuthStore } from '@/stores/authStore';
import { enrollmentsApi } from '@/services/api/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockConfig: any = {
  headers: {},
  timeout: 0,
  baseURL: '',
  method: 'get',
  url: '',
  data: undefined,
  params: undefined,
};

// Mock the APIs
vi.mock('@/services/api/client', () => ({
  enrollmentsApi: {
    list: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
  studentsApi: {
    list: vi.fn(),
  },
  courseOfferingsApi: {
    list: vi.fn(),
  },
}));

// Mock auth store
vi.mock('@/stores/authStore');

describe('EnrollmentsPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 'user-admin', email: 'admin@example.com', firstName: 'Admin', lastName: 'User', role: 'ADMIN' },
      accessToken: 'mock-token',
      isAuthenticated: true,
      isHydrated: true,
    });
  });

  it('renders page header', async () => {
    vi.mocked(enrollmentsApi.list).mockResolvedValueOnce({ 
      data: [], 
      status: 200, 
      statusText: 'OK', 
      headers: {}, 
      config: mockConfig 
    });

    render(
      <QueryClientProvider client={queryClient}>
        <EnrollmentsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Enrollments')).toBeInTheDocument();
    });
  });

  it('shows empty state when no enrollments', async () => {
    vi.mocked(enrollmentsApi.list).mockResolvedValueOnce({ 
      data: [], 
      status: 200, 
      statusText: 'OK', 
      headers: {}, 
      config: mockConfig 
    });

    render(
      <QueryClientProvider client={queryClient}>
        <EnrollmentsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No enrollments found')).toBeInTheDocument();
    });
  });
});