/**
 * themeStore — persists light/dark preference in localStorage.
 * Applies data-theme attribute to <html> immediately on init.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

function applyTheme(t: Theme) {
  if (t === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

interface ThemeStore {
  theme:  Theme;
  toggle: () => void;
  set:    (t: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ theme: next });
      },
      set: (t) => { applyTheme(t); set({ theme: t }); },
    }),
    {
      name: 'mercury-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);
