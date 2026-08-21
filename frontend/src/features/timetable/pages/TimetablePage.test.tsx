import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TimetablePage } from './TimetablePage';

vi.mock('@/services/api/client', () => ({
  timetableApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
  },
  courseOfferingsApi: {
    list: vi.fn(),
  },
  roomsApi: {
    list: vi.fn(),
  },
  instructorsApi: {
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
        <TimetablePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  const api = await import('@/services/api/client');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timetableApi = api.timetableApi as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseOfferingsApi = api.courseOfferingsApi as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roomsApi = api.roomsApi as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instructorsApi = api.instructorsApi as any;

  timetableApi.list.mockResolvedValue({
    data: [
      {
        id: 'slot-1',
        courseOfferingId: 'co-1',
        roomId: 'r-1',
        instructorId: 'i-1',
        dayOfWeek: 'MONDAY',
        startTime: '08:30:00',
        endTime: '10:00:00',
        startWeek: 1,
        endWeek: 16,
        recurrencePattern: 'WEEKLY',
        sessionType: 'LECTURE',
        status: 'ACTIVE',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        courseOffering: {
          course: {
            id: 'c-1',
            code: 'CS101',
            title: 'Introduction to Computer Science',
            description: 'An intro course',
            creditHours: 3,
            status: 'ACTIVE',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        },
        room: {
          building: {
            id: 'b-1',
            code: 'BLK-A',
            name: 'Engineering Block',
          },
        },
        instructor: {
          user: {
            id: 'u-1',
            email: 'prof@example.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      },
      {
        id: 'slot-2',
        courseOfferingId: 'co-2',
        roomId: 'r-2',
        instructorId: null,
        dayOfWeek: 'WEDNESDAY',
        startTime: '14:00:00',
        endTime: '15:30:00',
        startWeek: 1,
        endWeek: 14,
        recurrencePattern: 'BIWEEKLY_EVEN',
        sessionType: 'LABORATORY',
        status: 'SUSPENDED',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        courseOffering: {
          course: {
            id: 'c-2',
            code: 'MATH201',
            title: 'Linear Algebra',
            description: 'Linear algebra fundamentals',
            creditHours: 4,
            status: 'ACTIVE',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        },
        room: {
          building: {
            id: 'b-2',
            code: 'BLK-B',
            name: 'Science Block',
          },
        },
      },
    ],
  });

  courseOfferingsApi.list.mockResolvedValue({
    data: [
      { id: 'co-1', courseId: 'c-1', semesterId: 's-1', instructorId: 'i-1', roomId: 'r-1', sectionCode: 'A01', deliveryMode: 'REGULAR', maxCapacity: 50, currentEnrollment: 30, status: 'OPEN', syllabusUrl: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 'co-2', courseId: 'c-2', semesterId: 's-1', instructorId: null, roomId: 'r-2', sectionCode: 'B01', deliveryMode: 'EXTENSION', maxCapacity: 30, currentEnrollment: 15, status: 'OPEN', syllabusUrl: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ],
  });

  roomsApi.list.mockResolvedValue({
    data: [
      { id: 'r-1', code: 'ENG-201', roomNumber: '201', name: 'Lecture Hall 1', type: 'LECTURE_HALL', capacity: 100, floorLevel: 2, isAccessible: true, hasProjector: true, hasComputers: false, computerCount: 0, hasLabEquipment: false, buildingId: 'b-1', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', building: { id: 'b-1', code: 'BLK-A', name: 'Engineering Block' } },
      { id: 'r-2', code: 'SCI-301', roomNumber: '301', name: 'Lab 3', type: 'LABORATORY', capacity: 30, floorLevel: 3, isAccessible: true, hasProjector: false, hasComputers: true, computerCount: 20, hasLabEquipment: true, buildingId: 'b-2', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', building: { id: 'b-2', code: 'BLK-B', name: 'Science Block' } },
    ],
  });

  instructorsApi.list.mockResolvedValue({
    data: [
      { id: 'i-1', employeeId: 'EMP-001', title: 'Dr.', officeLocation: 'Room 105', status: 'ACTIVE', userId: 'u-1', departmentId: 'd-1', user: { id: 'u-1', email: 'prof@example.com', firstName: 'John', lastName: 'Doe', role: 'INSTRUCTOR' }, department: { id: 'd-1', code: 'CSE', name: 'Computer Science' } },
    ],
  });
});

describe('TimetablePage', () => {
  it('renders page header', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /timetable/i })).toBeInTheDocument();
    });
  });

  it('displays timetable slot data in table rows', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
    // Use the table body to avoid matching the <option> in the day filter dropdown
    const tableBodies = screen.getAllByRole('rowgroup');
    const tableBody = tableBodies[1];
    expect(tableBody.textContent).toContain('MONDAY');
    expect(tableBody.textContent).toContain('08:30:00');
    expect(tableBody.textContent).toContain('10:00:00');
  });

  it('shows create button for ADMIN users', async () => {
    renderPage();

    await waitFor(() => {
      const button = screen.queryByRole('button', { name: /new slot/i });
      expect(button).toBeInTheDocument();
    });
  });

  it('filters slots by search term', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search timetable/i);
    fireEvent.change(searchInput, { target: { value: 'MATH' } });

    await waitFor(() => {
      expect(screen.getByText('MATH201')).toBeInTheDocument();
      expect(screen.queryByText('CS101')).not.toBeInTheDocument();
    });
  });

  it('filters slots by day of week', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const dayFilter = screen.getByDisplayValue('All days');
    fireEvent.change(dayFilter, { target: { value: 'WEDNESDAY' } });

    await waitFor(() => {
      expect(screen.getByText('MATH201')).toBeInTheDocument();
      expect(screen.queryByText('CS101')).not.toBeInTheDocument();
    });
  });

  it('filters slots by session type', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const sessionFilter = screen.getByDisplayValue('All session types');
    fireEvent.change(sessionFilter, { target: { value: 'LABORATORY' } });

    await waitFor(() => {
      expect(screen.getByText('MATH201')).toBeInTheDocument();
      expect(screen.queryByText('CS101')).not.toBeInTheDocument();
    });
  });

  it('filters slots by status', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const statusFilter = screen.getByDisplayValue('All statuses');
    fireEvent.change(statusFilter, { target: { value: 'SUSPENDED' } });

    await waitFor(() => {
      expect(screen.getByText('MATH201')).toBeInTheDocument();
      expect(screen.queryByText('CS101')).not.toBeInTheDocument();
    });
  });

  it('filters slots by recurrence pattern', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const recurrenceFilter = screen.getByDisplayValue('All recurrences');
    fireEvent.change(recurrenceFilter, { target: { value: 'BIWEEKLY_EVEN' } });

    await waitFor(() => {
      expect(screen.getByText('MATH201')).toBeInTheDocument();
      expect(screen.queryByText('CS101')).not.toBeInTheDocument();
    });
  });

  it('displays empty state when no slots match search', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search timetable/i);
    fireEvent.change(searchInput, { target: { value: 'xyz' } });

    await waitFor(() => {
      expect(screen.getByText(/no timetable slots found/i)).toBeInTheDocument();
    });
  });

  it('displays instructor information when available', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const tableBodies = screen.getAllByRole('rowgroup');
    const tableBody = tableBodies[1];
    expect(tableBody.textContent).toContain('John');
    expect(tableBody.textContent).toContain('Doe');
  });

  it('displays building name for room', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('CS101')).toBeInTheDocument();
    });

    const tableBodies = screen.getAllByRole('rowgroup');
    const tableBody = tableBodies[1];
    expect(tableBody.textContent).toContain('Engineering Block');
  });
});
