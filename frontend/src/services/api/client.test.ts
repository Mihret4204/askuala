/**
 * Auth API client tests.
 *
 * Strategy: import the real apiClient and spy on its .post / .get methods
 * so no real HTTP is made but the wrapper functions are tested as-is.
 *
 * Tests cover:
 *  - authApi.login calls POST /auth/login with correct payload and returns data
 *  - authApi.register calls POST /auth/register and returns data
 *  - authApi.me calls GET /auth/me and returns data
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient, { authApi } from './client';
import type { AuthResponse, UserSummary } from '@/types/api';

// Spy on the axios instance methods — no real HTTP, no mock module conflicts.
const mockPost = vi.spyOn(apiClient, 'post');
const mockGet = vi.spyOn(apiClient, 'get');

const fakeAuthResponse: AuthResponse = {
  user: {
    id: 'u1',
    email: 'alice@uni.edu',
    firstName: 'Alice',
    lastName: 'Smith',
    role: 'STUDENT',
    status: 'ACTIVE',
  },
  accessToken: 'tok.en.here',
};

const fakeUser: UserSummary = fakeAuthResponse.user;

// Helper to build an axios-like resolved value
const ok = <T>(data: T) => Promise.resolve({ data, status: 200, headers: {}, config: {} });

beforeEach(() => {
  mockPost.mockReset();
  mockGet.mockReset();
  // Clear the in-memory localStorage polyfill from setup.ts
  localStorage.clear();
});

// ---------------------------------------------------------------------------
describe('authApi.login', () => {
  it('calls POST /auth/login with email and password', async () => {
    mockPost.mockReturnValueOnce(ok(fakeAuthResponse));

    const payload = { email: 'alice@uni.edu', password: 'secret123' };
    await authApi.login(payload);

    expect(mockPost).toHaveBeenCalledWith('/auth/login', payload);
  });

  it('returns the AuthResponse data', async () => {
    mockPost.mockReturnValueOnce(ok(fakeAuthResponse));

    const result = await authApi.login({ email: 'a@b.com', password: 'pass123' });

    expect(result.data).toEqual(fakeAuthResponse);
    expect(result.data.accessToken).toBe('tok.en.here');
  });
});

// ---------------------------------------------------------------------------
describe('authApi.register', () => {
  it('calls POST /auth/register with the full payload', async () => {
    mockPost.mockReturnValueOnce(ok(fakeAuthResponse));

    const payload = {
      email: 'bob@uni.edu',
      password: 'pass456',
      firstName: 'Bob',
      lastName: 'Jones',
    };
    await authApi.register(payload);

    expect(mockPost).toHaveBeenCalledWith('/auth/register', payload);
  });

  it('returns the AuthResponse data', async () => {
    mockPost.mockReturnValueOnce(ok(fakeAuthResponse));

    const result = await authApi.register({
      email: 'x@x.com',
      password: 'pass456',
      firstName: 'X',
      lastName: 'Y',
    });

    expect(result.data.user.email).toBe('alice@uni.edu');
  });
});

// ---------------------------------------------------------------------------
describe('authApi.me', () => {
  it('calls GET /auth/me', async () => {
    mockGet.mockReturnValueOnce(ok(fakeUser));

    await authApi.me();

    expect(mockGet).toHaveBeenCalledWith('/auth/me');
  });

  it('returns UserSummary data', async () => {
    mockGet.mockReturnValueOnce(ok(fakeUser));

    const result = await authApi.me();

    expect(result.data).toEqual(fakeUser);
    expect(result.data.role).toBe('STUDENT');
  });
});
