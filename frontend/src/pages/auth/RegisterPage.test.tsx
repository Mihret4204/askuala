/**
 * RegisterPage tests.
 *
 * Tests cover:
 *  - Form renders all required fields and submit button
 *  - Client-side validation messages for blank fields
 *  - Successful registration calls authApi.register, setAuth, navigates to /dashboard
 *  - 409 conflict shows "An account with this email already exists."
 *  - Generic error shows the server message
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import type { ApiErrorShape, AuthResponse } from '@/types/api';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/services/api/client', () => ({
  authApi: {
    register: vi.fn(),
  },
}));

const mockSetAuth = vi.fn();
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { setAuth: typeof mockSetAuth }) => unknown) =>
    selector({ setAuth: mockSetAuth }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { authApi } from '@/services/api/client';

const mockRegister = vi.mocked(authApi.register);

// ---------------------------------------------------------------------------
const mockAuthResponse: AuthResponse = {
  user: { id: 'u2', email: 'bob@uni.edu', firstName: 'Bob', lastName: 'Jones', role: 'STUDENT', status: 'ACTIVE' },
  accessToken: 'new.tok.en',
};

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

// Helper to fill all required fields
async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), 'Bob');
  await user.type(screen.getByLabelText(/last name/i), 'Jones');
  await user.type(screen.getByLabelText(/email/i), 'bob@uni.edu');
  await user.type(screen.getByLabelText(/password/i), 'secure456');
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe('RegisterPage — rendering', () => {
  it('renders first name, last name, email, password fields and submit button', () => {
    renderRegisterPage();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders a link to the login page', () => {
    renderRegisterPage();

    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe('RegisterPage — validation', () => {
  it('shows first name required error when submitted blank', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
  });

  it('shows email validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/first name/i), 'Bob');
    await user.type(screen.getByLabelText(/last name/i), 'Jones');
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'secure456');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
  });

  it('shows password length error when password is too short', async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.type(screen.getByLabelText(/first name/i), 'Bob');
    await user.type(screen.getByLabelText(/last name/i), 'Jones');
    await user.type(screen.getByLabelText(/email/i), 'bob@uni.edu');
    await user.type(screen.getByLabelText(/password/i), 'abc');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe('RegisterPage — successful registration', () => {
  it('calls authApi.register with firstName, lastName, email, password', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({ data: mockAuthResponse } as never);
    renderRegisterPage();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@uni.edu',
        password: 'secure456',
      });
    });
  });

  it('calls setAuth with the user and token from the response', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({ data: mockAuthResponse } as never);
    renderRegisterPage();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        mockAuthResponse.user,
        mockAuthResponse.accessToken,
      );
    });
  });

  it('navigates to /dashboard after successful registration', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({ data: mockAuthResponse } as never);
    renderRegisterPage();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});

// ---------------------------------------------------------------------------
describe('RegisterPage — API errors', () => {
  it('shows conflict message on 409 response', async () => {
    const user = userEvent.setup();
    const apiError: ApiErrorShape = { message: 'Email already registered', status: 409 };
    mockRegister.mockRejectedValueOnce(apiError);
    renderRegisterPage();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByText(/an account with this email already exists/i),
    ).toBeInTheDocument();
  });

  it('shows the server message on a generic error', async () => {
    const user = userEvent.setup();
    const apiError: ApiErrorShape = { message: 'Internal server error', status: 500 };
    mockRegister.mockRejectedValueOnce(apiError);
    renderRegisterPage();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/internal server error/i)).toBeInTheDocument();
  });

  it('does not navigate on error', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce({ message: 'fail', status: 409 } as ApiErrorShape);
    renderRegisterPage();

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
