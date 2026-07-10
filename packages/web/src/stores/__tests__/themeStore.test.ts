import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../themeStore';

beforeEach(() => {
  useThemeStore.setState({ auroraEnabled: true });
});

describe('themeStore', () => {
  it('auroraEnabled defaults to true', () => {
    expect(useThemeStore.getState().auroraEnabled).toBe(true);
  });

  it('toggleAurora turns aurora off', () => {
    useThemeStore.getState().toggleAurora();
    expect(useThemeStore.getState().auroraEnabled).toBe(false);
  });

  it('toggleAurora turns aurora back on', () => {
    useThemeStore.getState().toggleAurora();
    useThemeStore.getState().toggleAurora();
    expect(useThemeStore.getState().auroraEnabled).toBe(true);
  });

  it('no light/dark theme toggle exists', () => {
    // Command Stream is dark-only — no theme field should be present
    expect((useThemeStore.getState() as any).theme).toBeUndefined();
    expect((useThemeStore.getState() as any).toggleTheme).toBeUndefined();
  });
});
