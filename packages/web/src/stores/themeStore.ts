import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * themeStore — Command Stream edition.
 * Light/dark toggle removed — Command Stream is dark-only.
 * auroraEnabled: user can disable aurora for reduced motion / performance.
 */
interface ThemeState {
  auroraEnabled: boolean;
  toggleAurora:  () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      auroraEnabled: true,
      toggleAurora: () => set((s) => ({ auroraEnabled: !s.auroraEnabled })),
    }),
    { name: 'mercury-theme' },
  ),
);
