/**
 * Auth store unit tests.
 *
 * The setup.ts file installs an in-memory localStorage polyfill before
 * any test runs, so Zustand's persist middleware and the store's
 * localStorage side-effects work correctly in Node 25.
 *
 * Tests cover:
 *  - Initial state after first creation
 *  - setAuth stores user + token, flips flags, writes to localStorage
 *  - setAuth(null, null) clears auth state and removes token
 *  - clearAuth resets everything and removes token from localStorage
 *  - isHydrated is true after both setAuth and clearAuth
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './authStore';
import type { UserSummary } from '@/types/api';

// ---------------------------------------------------------------------------
const alice: UserSummary = {
  id: 'user-uuid-1',
  email: 'alice@uni.edu',
  firstName: 'Alice',
  lastName: 'Smith',
  role: 'STUDENT',
  status: 'ACTIVE',
};

const TOKEN = 'header.payload.sig';

// Reset store to a blank slate before each test using Zustand's setState.
// This is safer than calling clearAuth because setState bypasses any
// side-effect code in the action methods themselves.
beforeEach(() => {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isHydrated: false,
  });
  localStorage.clear();
});

// ---------------------------------------------------------------------------
describe('initial state', () => {
  it('starts with null user and null token', () => {
    const { user, accessToken } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(accessToken).toBeNull();
  });

  it('starts unauthenticated', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('setAuth — with valid user and token', () => {
  it('stores the user object in state', () => {
    useAuthStore.getState().setAuth(alice, TOKEN);
    expect(useAuthStore.getState().user).toEqual(alice);
  });

  it('stores the access token in state', () => {
    useAuthStore.getState().setAuth(alice, TOKEN);
    expect(useAuthStore.getState().accessToken).toBe(TOKEN);
  });

  it('sets isAuthenticated to true', () => {
    useAuthStore.getState().setAuth(alice, TOKEN);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('writes the token to localStorage', () => {
    useAuthStore.getState().setAuth(alice, TOKEN);
    expect(localStorage.getItem('accessToken')).toBe(TOKEN);
  });

  it('marks isHydrated as true', () => {
    useAuthStore.getState().setAuth(alice, TOKEN);
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('setAuth — with null values', () => {
  it('sets isAuthenticated to false when user is null', () => {
    useAuthStore.getState().setAuth(null, TOKEN);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('sets isAuthenticated to false when token is null', () => {
    useAuthStore.getState().setAuth(alice, null);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('removes token from localStorage when token is null', () => {
    localStorage.setItem('accessToken', TOKEN);
    useAuthStore.getState().setAuth(null, null);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('clearAuth', () => {
  beforeEach(() => {
    // Populate first so we can verify the wipe
    useAuthStore.getState().setAuth(alice, TOKEN);
  });

  it('sets user to null', () => {
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('sets accessToken to null', () => {
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('sets isAuthenticated to false', () => {
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('removes the token from localStorage', () => {
    useAuthStore.getState().clearAuth();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('marks isHydrated as true', () => {
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().isHydrated).toBe(true);
  });
});
