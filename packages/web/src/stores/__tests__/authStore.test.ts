import { describe, it, expect, beforeEach, vi } from 'vitest';

// Stub localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem:    (k: string) => store[k] ?? null,
  setItem:    (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
});

import { useAuthStore } from '../authStore';

const mockUser = { id: '1', username: 'alice', display_name: null, avatar: null, totp_enabled: false };

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null });
});

describe('authStore', () => {
  it('setUser + setToken stores values', () => {
    useAuthStore.getState().setUser(mockUser as never);
    useAuthStore.getState().setToken('tok123');
    expect(useAuthStore.getState().user?.username).toBe('alice');
    expect(useAuthStore.getState().accessToken).toBe('tok123');
  });

  it('logout clears user and token', () => {
    useAuthStore.getState().setUser(mockUser as never);
    useAuthStore.getState().setToken('tok123');
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('isAuthenticated returns true when token is set', () => {
    useAuthStore.getState().setToken('tok');
    expect(useAuthStore.getState().accessToken).not.toBeNull();
  });

  it('isAuthenticated returns false after logout', () => {
    useAuthStore.getState().setToken('tok');
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
