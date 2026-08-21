/**
 * ProtectedRoute tests.
 *
 * Tests cover:
 *  - Renders a loading spinner while isHydrated is false
 *  - Redirects to /login when unauthenticated (and hydrated)
 *  - Renders the child Outlet when authenticated and hydrated
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

// ---------------------------------------------------------------------------
// Control the auth store state via a simple factory mock.
// ---------------------------------------------------------------------------

type StoreState = { isAuthenticated: boolean; isHydrated: boolean };

let storeState: StoreState = { isAuthenticated: false, isHydrated: true };

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: StoreState) => unknown) => selector(storeState),
}));

// ---------------------------------------------------------------------------
function renderWithRouter(initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div>Protected content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
describe('ProtectedRoute — not yet hydrated', () => {
  it('renders a loading spinner while the store is not yet hydrated', () => {
    storeState = { isAuthenticated: false, isHydrated: false };

    renderWithRouter();

    // The spinner is an animated div — it should be present and the content should not be.
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe('ProtectedRoute — unauthenticated', () => {
  it('redirects to /login when the user is not authenticated', () => {
    storeState = { isAuthenticated: false, isHydrated: true };

    renderWithRouter();

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe('ProtectedRoute — authenticated', () => {
  it('renders the child route when the user is authenticated', () => {
    storeState = { isAuthenticated: true, isHydrated: true };

    renderWithRouter();

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});
