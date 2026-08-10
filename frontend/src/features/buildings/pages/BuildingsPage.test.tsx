import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { BuildingsPage } from './BuildingsPage';

type BuildingsApiMock = {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

vi.mock('@/services/api/client', () => ({
  buildingsApi: {
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
        <BuildingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  const api = await import('@/services/api/client');
  const buildingsApi = api.buildingsApi as unknown as BuildingsApiMock;
  buildingsApi.list.mockResolvedValue({
    data: [
      {
        id: 'bld-1',
        code: 'BLK-A',
        name: 'Engineering Block A',
        campusName: 'Main Campus',
        totalFloors: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        rooms: [
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
            hasComputers: false,
            computerCount: 0,
            hasLabEquipment: true,
            buildingId: 'bld-1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            building: { id: 'bld-1', code: 'BLK-A', name: 'Engineering Block A' },
          },
        ],
      },
    ],
  });
});

describe('BuildingsPage', () => {
  it('renders page header', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /buildings/i })).toBeInTheDocument();
    });
  });

  it('displays building data in table rows', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BLK-A')).toBeInTheDocument();
    });

    expect(screen.getByText('Engineering Block A')).toBeInTheDocument();
    expect(screen.getByText('Main Campus')).toBeInTheDocument();
  });

  it('shows create button for ADMIN users', async () => {
    renderPage();

    await waitFor(() => {
      const button = screen.queryByRole('button', { name: /new building/i });
      expect(button).toBeInTheDocument();
    });
  });

  it('filters buildings by search term', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BLK-A')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search buildings/i);
    fireEvent.change(searchInput, { target: { value: 'xyz' } });

    await waitFor(() => {
      expect(screen.queryByText('BLK-A')).not.toBeInTheDocument();
    });
  });

  it('displays empty state when no buildings match search', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('BLK-A')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search buildings/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText(/no buildings found/i)).toBeInTheDocument();
    });
  });
});
