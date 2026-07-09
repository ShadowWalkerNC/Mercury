import { create } from 'zustand';
import type { User } from '@mercury/shared';

const REFRESH_TOKEN_KEY = 'mercury_refresh_token';

interface AuthState {
  user:         User | null;
  accessToken:  string | null;
  isLoading:    boolean;
  totpRequired: boolean;
  totpSession:  string | null;

  login:     (email: string, password: string) => Promise<void>;
  register:  (username: string, email: string, password: string) => Promise<void>;
  refresh:   () => Promise<boolean>;
  logout:    () => void;
  setTokens: (accessToken: string, refreshToken: string, user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, accessToken: null, isLoading: false, totpRequired: false, totpSession: null,

  setTokens(accessToken, refreshToken, user) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    set({ user, accessToken, totpRequired: false, totpSession: null });
  },

  async login(email, password) {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as {
      user?: User; access_token?: string; refresh_token?: string;
      totp_required?: boolean; totp_session?: string; error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? 'Login failed');
    if (data.totp_required && data.totp_session) {
      set({ totpRequired: true, totpSession: data.totp_session }); return;
    }
    get().setTokens(data.access_token!, data.refresh_token!, data.user!);
  },

  async register(username, email, password) {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json() as {
      user?: User; access_token?: string; refresh_token?: string; error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? 'Registration failed');
    get().setTokens(data.access_token!, data.refresh_token!, data.user!);
  },

  async refresh() {
    const rt = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!rt) return false;
    set({ isLoading: true });
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) { get().logout(); return false; }
      const data = await res.json() as { access_token: string; refresh_token: string; user: User };
      get().setTokens(data.access_token, data.refresh_token, data.user);
      return true;
    } catch { get().logout(); return false; }
    finally { set({ isLoading: false }); }
  },

  logout() {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    set({ user: null, accessToken: null, totpRequired: false, totpSession: null });
  },
}));
