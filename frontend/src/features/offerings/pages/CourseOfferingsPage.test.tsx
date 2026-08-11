import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CourseOfferingsPage } from './CourseOfferingsPage';

vi.mock('@/services/api/client', () => ({
  courseOfferingsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
  },
  coursesApi: {
    list: vi.fn(),
  },
  academicCalendarApi: {
    listSemesters: vi.fn(),
  },
  instructorsApi: {
    list: vi.fn(),
  },
  roomsApi: {
    list: vi.fn(),
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
        <CourseOfferingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  const api = await import('@/services/api/client');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseOfferingsApi = api.courseOfferingsApi as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coursesApi = api.coursesApi as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const academicCalendarApi = api.academicCalendarApi as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instructorsApi = api.instructorsApi as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roomsApi = api.roomsApi as any;
  
  courseOfferingsApi.list.mockResolvedValue({
    data: [
      {
        id: 'co-1',
        courseId: 'c-1',
        semesterId: 's-1',
        instructorId: 'i-1',
        roomId: 'r-1',
        sectionCode: 'A01',
        deliveryMode: 'REGULAR',
        maxCapacity: 50,
        currentEnrollment: 30,
        status: 'OPEN',
        syllabusUrl: 'https://example.com/syllabus.pdf',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        course: {
          id: 'c-1',
          code: 'CS101',
          title: 'Introduction to Computer Science',
          creditHours: 3,
        },
        semester: {
          id: 's-1',
          code: 'F2024',
          name: 'Fall 2024',
        },
        instructor: {
          id: 'i-1',
          user: {
            id: 'u-1',
            email: 'prof@example.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
        room: {
          id: 'r-1',
          code: 'LAB-201',
          roomNumber: '201',
          capacity: 50,
          building: {
            id: 'b-1',
            code: 'BLK-A',
            name: 'Engineering Block',
          },
        },
      },
      {
        id: 'co-2',
        courseId: 'c-2',
        semesterId: 's-1',
        instructorId: null,
        roomId: null,
        sectionCode: 'B01',
        deliveryMode: 'DISTANCE',
        maxCapacity: 100,
        currentEnrollment: 45,
        status: 'PLANNED',
        syllabusUrl: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        course: {
          id: 'c-2',
          code: 'MATH101',
          title: 'Calculus I',
          creditHours: 4,
        },
        semester: {
          id: 's-1',
          code: 'F2024',
          name: 'Fall 2024',
        },
        instructor: null,
        room: null,
      },
    ],
  });

  coursesApi.list.mockResolvedValue({
    data: [
      { id: 'c-1', code: 'CS101', title: 'Introduction to Computer Science', creditHours: 3, status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ],
  });

  academicCalendarApi.listSemesters.mockResolvedValue({
    data: [
      { id: 's-1', academicYearId: 'y-1', code: 'F2024', name: 'Fall 2024', termType: 'FALL', startDate: '2024-09-01', endDate: '2024-12-31', registrationStartDate: null, registrationEndDate: null, isCurrent: true, status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', academicYear: null },
    ],
  });

  instructorsApi.list.mockResolvedValue({
    data: [],
  });

  roomsApi.list.mockResolvedValue({
    data: [],
  });
});

describe('CourseOfferingsPage', () => {
  it('renders page header', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /course offerings/i })).toBeInTheDocument();
    });
  });

  it('displays course offering data in table rows', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
    expect(screen.getByText('A01')).toBeInTheDocument();
    // F2024 appears in both the table and the select, so just check the table body
    const tableBodies = screen.getAllByRole('rowgroup');
    expect(tableBodies[1].textContent).toContain('F2024');
  });

  it('shows create button for ADMIN users', async () => {
    renderPage();

    await waitFor(() => {
      const button = screen.queryByRole('button', { name: /new offering/i });
      expect(button).toBeInTheDocument();
    });
  });

  it('filters offerings by search term', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search offerings/i);
    fireEvent.change(searchInput, { target: { value: 'MATH' } });

    await waitFor(() => {
      expect(screen.getByText('MATH101')).toBeInTheDocument();
      expect(screen.queryByText('CS101')).not.toBeInTheDocument();
    });
  });

  it('filters offerings by delivery mode', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const modeFilter = screen.getByDisplayValue('All delivery modes');
    fireEvent.change(modeFilter, { target: { value: 'DISTANCE' } });

    await waitFor(() => {
      expect(screen.getByText('MATH101')).toBeInTheDocument();
      expect(screen.queryByText('CS101')).not.toBeInTheDocument();
    });
  });

  it('filters offerings by status', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const statusFilter = screen.getByDisplayValue('All statuses');
    fireEvent.change(statusFilter, { target: { value: 'PLANNED' } });

    await waitFor(() => {
      expect(screen.getByText('MATH101')).toBeInTheDocument();
      expect(screen.queryByText('CS101')).not.toBeInTheDocument();
    });
  });

  it('displays empty state when no offerings match search', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search offerings/i);
    fireEvent.change(searchInput, { target: { value: 'xyz' } });

    await waitFor(() => {
      expect(screen.getByText(/no course offerings found/i)).toBeInTheDocument();
    });
  });

  it('displays room information when available', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    // Check the table contains room info in the row
    const tableBodies = screen.getAllByRole('rowgroup');
    const tableBody = tableBodies[1]; // tbody is second rowgroup
    expect(tableBody.textContent).toContain('LAB-201');
    expect(tableBody.textContent).toContain('Engineering Block');
  });

  it('displays instructor information when available', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    // Check the table contains instructor info
    const tableBodies = screen.getAllByRole('rowgroup');
    const tableBody = tableBodies[1]; // tbody is second rowgroup
    expect(tableBody.textContent).toContain('John');
    expect(tableBody.textContent).toContain('Doe');
  });
});
