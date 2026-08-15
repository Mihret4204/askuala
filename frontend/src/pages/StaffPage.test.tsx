import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { StaffPage } from './StaffPage';
import { usersApi } from '@/services/api/client';
import type { UserRecord, UserSummary } from '@/types/api';

type UsersApiMock = {
  list: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

vi.mock('@/services/api/client', () => ({
  usersApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
  },
}));

const {
  setStoreUser,
  useAuthStoreMock,
} = vi.hoisted(() => {
  let storeUser: UserSummary | null = null;
  const useAuthStoreMock = vi.fn(
    (selector: (state: { user: UserSummary | null }) => unknown) =>
      selector({
        user: storeUser,
      }),
  );
  return {
    setStoreUser: (user: UserSummary | null) => {
      storeUser = user;
    },
    useAuthStoreMock,
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: useAuthStoreMock,
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StaffPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockUsers: UserRecord[] = [
  {
    id: 'user-1',
    email: 'alice@uni.edu',
    firstName: 'Alice',
    lastName: 'Smith',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'bob@uni.edu',
    firstName: 'Bob',
    lastName: 'Jones',
    role: 'STUDENT',
    status: 'SUSPENDED',
    createdAt: '2024-02-01T00:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  setStoreUser({
    id: 'admin-id',
    email: 'admin@uni.edu',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
    status: 'ACTIVE',
  });
  const mockUsersApi = usersApi as unknown as UsersApiMock;
  mockUsersApi.list.mockResolvedValue({ data: mockUsers });
});

describe('StaffPage', () => {
  it('renders users page header and search elements', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by name or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by role/i)).toBeInTheDocument();
  });

  it('displays user data in table rows', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('alice@uni.edu')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('bob@uni.edu')).toBeInTheDocument();
    expect(screen.getByText('STUDENT')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('shows create button for ADMIN users but hides it for REGISTRAR users', async () => {
    // 1. Admin
    const { unmount } = renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new user/i })).toBeInTheDocument();
    });
    unmount();

    // 2. Registrar
    setStoreUser({
      id: 'registrar-id',
      email: 'reg@uni.edu',
      firstName: 'Reg',
      lastName: 'User',
      role: 'REGISTRAR',
      status: 'ACTIVE',
    });
    renderPage();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /new user/i })).not.toBeInTheDocument();
    });
  });

  it('filters users by search query', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'bob' } });

    await waitFor(() => {
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    });
  });

  it('filters users by role dropdown selection', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const roleDropdown = screen.getByLabelText(/filter by role/i);
    fireEvent.change(roleDropdown, { target: { value: 'STUDENT' } });

    await waitFor(() => {
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    });
  });

  it('displays empty state when no users match criteria', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });
  });

  it('allows ADMIN to open modal and create a new user', async () => {
    const mockUsersApi = usersApi as unknown as UsersApiMock;
    mockUsersApi.create.mockResolvedValue({
      data: {
        id: 'user-3',
        email: 'charlie@uni.edu',
        firstName: 'Charlie',
        lastName: 'Brown',
        role: 'INSTRUCTOR',
        status: 'ACTIVE',
        createdAt: '2024-03-01T00:00:00Z',
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new user/i })).toBeInTheDocument();
    });

    // Open Modal
    fireEvent.click(screen.getByRole('button', { name: /new user/i }));
    expect(screen.getByRole('heading', { name: 'Create user' })).toBeInTheDocument();

    // Fill Form
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Charlie' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Brown' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'charlie@uni.edu' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'INSTRUCTOR' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => {
      expect(mockUsersApi.create).toHaveBeenCalledWith({
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie@uni.edu',
        password: 'password123',
        role: 'INSTRUCTOR',
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Create user' })).not.toBeInTheDocument();
    });
  });

  it('displays loading state during initial load', () => {
    const mockUsersApi = usersApi as unknown as UsersApiMock;
    mockUsersApi.list.mockReturnValue(new Promise(() => {}));

    renderPage();

    // TableSkeleton renders table rows representing loader placeholder
    const tableSkeleton = screen.getByRole('table');
    expect(tableSkeleton).toBeInTheDocument();
  });

  it('displays ErrorAlert on list fetch API error', async () => {
    const mockUsersApi = usersApi as unknown as UsersApiMock;
    mockUsersApi.list.mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });
});
