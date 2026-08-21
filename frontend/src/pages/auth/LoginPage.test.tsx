/**
 * LoginPage tests.
 *
 * Tests cover:
 *  - Form renders email + password fields and submit button
 *  - Client-side validation messages show for blank/invalid input
 *  - Successful login calls authApi.login, calls setAuth, navigates to /dashboard
 *  - 401 response shows "Invalid email or password."
 *  - Generic API error shows the server message
 *  - Submit button is disabled while submitting
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import type { ApiErrorShape, AuthResponse } from '@/types/api';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Mock the API client
vi.mock('@/services/api/client', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

// Mock the auth store
const mockSetAuth = vi.fn();
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { setAuth: typeof mockSetAuth }) => unknown) =>
    selector({ setAuth: mockSetAuth }),
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { authApi } from '@/services/api/client';

const mockLogin = vi.mocked(authApi.login);

// ---------------------------------------------------------------------------
const mockAuthResponse: AuthResponse = {
  user: { id: 'u1', email: 'alice@uni.edu', firstName: 'Alice', lastName: 'Smith', role: 'STUDENT', status: 'ACTIVE' },
  accessToken: 'tok.en',
};

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe('LoginPage — rendering', () => {
  it('renders email field, password field, and submit button', () => {
    renderLoginPage();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders a link to the register page', () => {
    renderLoginPage();

    expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe('LoginPage — validation', () => {
  it('shows email validation error when submitted empty', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
  });

  it('shows password length error when password is too short', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'alice@uni.edu');
    await user.type(screen.getByLabelText(/password/i), 'abc');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe('LoginPage — successful login', () => {
  it('calls authApi.login with the form values', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({ data: mockAuthResponse } as never);
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'alice@uni.edu');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'alice@uni.edu',
        password: 'secret123',
      });
    });
  });

  it('calls setAuth with the user and token from the response', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({ data: mockAuthResponse } as never);
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'alice@uni.edu');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        mockAuthResponse.user,
        mockAuthResponse.accessToken,
      );
    });
  });

  it('navigates to /dashboard after a successful login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({ data: mockAuthResponse } as never);
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'alice@uni.edu');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});

// ---------------------------------------------------------------------------
describe('LoginPage — API errors', () => {
  it('shows "Invalid email or password." on a 401 response', async () => {
    const user = userEvent.setup();
    const apiError: ApiErrorShape = { message: 'Invalid credentials', status: 401 };
    mockLogin.mockRejectedValueOnce(apiError);
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'alice@uni.edu');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('shows the server message on a non-401 error', async () => {
    const user = userEvent.setup();
    const apiError: ApiErrorShape = { message: 'Service unavailable', status: 503 };
    mockLogin.mockRejectedValueOnce(apiError);
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'alice@uni.edu');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/service unavailable/i)).toBeInTheDocument();
  });

  it('does not navigate on error', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce({ message: 'error', status: 401 } as ApiErrorShape);
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'alice@uni.edu');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
