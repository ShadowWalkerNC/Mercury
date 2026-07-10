import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock DOM before importing store
const mockSetAttr   = vi.fn();
const mockRemoveAttr = vi.fn();
vi.stubGlobal('document', {
  documentElement: { setAttribute: mockSetAttr, removeAttribute: mockRemoveAttr },
});

import { useThemeStore } from '../themeStore';

beforeEach(() => {
  mockSetAttr.mockClear();
  mockRemoveAttr.mockClear();
  useThemeStore.setState({ theme: 'dark' });
});

describe('themeStore', () => {
  it('defaults to dark theme', () => {
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('toggle switches dark → light and sets attribute', () => {
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(mockSetAttr).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('toggle switches light → dark and removes attribute', () => {
    useThemeStore.setState({ theme: 'light' });
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(mockRemoveAttr).toHaveBeenCalledWith('data-theme');
  });

  it('set(light) applies attribute', () => {
    useThemeStore.getState().set('light');
    expect(mockSetAttr).toHaveBeenCalledWith('data-theme', 'light');
  });

  it('set(dark) removes attribute', () => {
    useThemeStore.getState().set('dark');
    expect(mockRemoveAttr).toHaveBeenCalledWith('data-theme');
  });
});
