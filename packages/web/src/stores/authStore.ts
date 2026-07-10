import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@mercury/shared';
import { api } from '@/lib/api';

interface AuthState {
  user:          User | null;
  accessToken:   string | null;
  totpPending:   boolean;

  login:         (identifier: string, password: string) => Promise<{ totp: boolean }>;
  loginTotp:     (code: string) => Promise<void>;
  register:      (username: string, email: string, password: string) => Promise<void>;
  logout:        () => Promise<void>;
  refresh:       () => Promise<void>;
  setUser:       (user: User | null) => void;
  setToken:      (token: string | null) => void;
  openTotpFlow:  () => void; // placeholder — wired in M-044
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null, accessToken: null, totpPending: false,

      async login(identifier, password) {
        const res = await api.post<{ access_token?: string; totp_required?: boolean; user?: User }>(
          '/api/v1/auth/login', { identifier, password }
        );
        if (res.totp_required) {
          set({ totpPending: true });
          return { totp: true };
        }
        set({ user: res.user ?? null, accessToken: res.access_token ?? null, totpPending: false });
        return { totp: false };
      },

      async loginTotp(code) {
        const res = await api.post<{ access_token: string; user: User }>(
          '/api/v1/auth/totp', { code }
        );
        set({ user: res.user, accessToken: res.access_token, totpPending: false });
      },

      async register(username, email, password) {
        const res = await api.post<{ access_token: string; user: User }>(
          '/api/v1/auth/register', { username, email, password }
        );
        set({ user: res.user, accessToken: res.access_token });
      },

      async logout() {
        try { await api.post('/api/v1/auth/logout', {}); } catch { /* ignore */ }
        set({ user: null, accessToken: null, totpPending: false });
      },

      async refresh() {
        const res = await api.post<{ access_token: string; user: User }>(
          '/api/v1/auth/refresh', {}
        );
        set({ user: res.user, accessToken: res.access_token });
      },

      setUser:      (user)  => set({ user }),
      setToken:     (token) => set({ accessToken: token }),
      openTotpFlow: ()      => { /* wired in M-044 */ },
    }),
    {
      name:    'mercury-auth',
      partialize: (s) => ({ accessToken: s.accessToken, user: s.user }),
    }
  )
);
