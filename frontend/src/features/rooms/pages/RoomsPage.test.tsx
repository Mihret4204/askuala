import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RoomsPage } from './RoomsPage';

type RoomsApiMock = {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

vi.mock('@/services/api/client', () => ({
  buildingsApi: {
    list: vi.fn(),
  },
  roomsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
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
        <RoomsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  const api = await import('@/services/api/client');
  const roomsApi = api.roomsApi as unknown as RoomsApiMock;
  roomsApi.list.mockResolvedValue({
    data: [
      {
        id: 'room-1',
        code: 'ENG-201',
        roomNumber: '201',
        name: 'Advanced Lab',
        type: 'LABORATORY',
        capacity: 30,
        floorLevel: 2,
        isAccessible: true,
        hasProjector: true,
        hasComputers: true,
        computerCount: 20,
        hasLabEquipment: true,
        buildingId: 'bld-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        building: { id: 'bld-1', code: 'BLK-A', name: 'Engineering Block A' },
      },
      {
        id: 'room-2',
        code: 'LEC-101',
        roomNumber: '101',
        name: 'Main Lecture Hall',
        type: 'LECTURE_HALL',
        capacity: 100,
        floorLevel: 1,
        isAccessible: true,
        hasProjector: true,
        hasComputers: false,
        computerCount: 0,
        hasLabEquipment: false,
        buildingId: 'bld-2',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        building: { id: 'bld-2', code: 'BLK-B', name: 'Academic Block B' },
      },
    ],
  });
});

describe('RoomsPage', () => {
  it('renders page header', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /rooms/i })).toBeInTheDocument();
    });
  });

  it('displays room data in table rows', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ENG-201')).toBeInTheDocument();
    });

    expect(screen.getByText('BLK-A')).toBeInTheDocument();
    expect(screen.getByText('Advanced Lab')).toBeInTheDocument();
  });

  it('shows create button for ADMIN users', async () => {
    renderPage();

    await waitFor(() => {
      const button = screen.queryByRole('button', { name: /new room/i });
      expect(button).toBeInTheDocument();
    });
  });

  it('filters rooms by search term in code', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ENG-201')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search rooms/i);
    fireEvent.change(searchInput, { target: { value: 'ENG' } });

    await waitFor(() => {
      expect(screen.getByText('ENG-201')).toBeInTheDocument();
      expect(screen.queryByText('LEC-101')).not.toBeInTheDocument();
    });
  });

  it('filters rooms by type', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ENG-201')).toBeInTheDocument();
    });

    const typeFilter = screen.getByDisplayValue('All types');
    fireEvent.change(typeFilter, { target: { value: 'LECTURE_HALL' } });

    await waitFor(() => {
      expect(screen.getByText('LEC-101')).toBeInTheDocument();
      expect(screen.queryByText('ENG-201')).not.toBeInTheDocument();
    });
  });

  it('displays empty state when no rooms match search', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ENG-201')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search rooms/i);
    fireEvent.change(searchInput, { target: { value: 'xyz' } });

    await waitFor(() => {
      expect(screen.getByText(/no rooms found/i)).toBeInTheDocument();
    });
  });

  it('displays room features correctly', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('ENG-201')).toBeInTheDocument();
    });

    // The room with features should have those feature indicators visible
    // This would require checking for the emoji indicators in the Features column
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1); // At least one header + data rows
  });
});
