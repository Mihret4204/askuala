import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AcademicCalendarPage } from './AcademicCalendarPage';

type AcademicCalendarApiMock = {
  listYears: ReturnType<typeof vi.fn>;
  listSemesters: ReturnType<typeof vi.fn>;
};

vi.mock('@/services/api/client', () => ({
  academicCalendarApi: {
    listYears: vi.fn(),
    listSemesters: vi.fn(),
    createYear: vi.fn(),
    createSemester: vi.fn(),
    activateYear: vi.fn(),
    activateSemester: vi.fn(),
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { user: { role: string } | null }) => unknown) =>
    selector({ user: { role: 'ADMIN' } }),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AcademicCalendarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  const api = await import('@/services/api/client');
  const academicCalendarApi = api.academicCalendarApi as unknown as AcademicCalendarApiMock;
  academicCalendarApi.listYears.mockResolvedValue({ data: [] });
  academicCalendarApi.listSemesters.mockResolvedValue({ data: [] });
});

describe('AcademicCalendarPage', () => {
  it('renders the calendar sections and create actions for admins', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/academic calendar/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /academic years/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /semesters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new academic year/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new semester/i })).toBeInTheDocument();
  });
});
