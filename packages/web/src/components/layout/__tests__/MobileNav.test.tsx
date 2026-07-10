import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNav } from '../MobileNav';
import { useUIStore } from '../../../stores/uiStore';

beforeEach(() => {
  useUIStore.setState({ activeMobileTab: 'channels' });
});

describe('MobileNav', () => {
  it('renders all five tabs', () => {
    render(<MobileNav />);
    expect(screen.getByLabelText('Spaces')).toBeTruthy();
    expect(screen.getByLabelText('Channels')).toBeTruthy();
    expect(screen.getByLabelText('DMs')).toBeTruthy();
    expect(screen.getByLabelText('Voice')).toBeTruthy();
    expect(screen.getByLabelText('You')).toBeTruthy();
  });

  it('marks active tab with aria-current="page"', () => {
    render(<MobileNav />);
    const active = screen.getByLabelText('Channels');
    expect(active.getAttribute('aria-current')).toBe('page');
  });

  it('does not mark inactive tabs as current', () => {
    render(<MobileNav />);
    const spaces = screen.getByLabelText('Spaces');
    expect(spaces.getAttribute('aria-current')).toBeNull();
  });

  it('calls setActiveMobileTab when tab clicked', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByLabelText('DMs'));
    expect(useUIStore.getState().activeMobileTab).toBe('dms');
  });

  it('updates aria-current after tab change', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByLabelText('Voice'));
    expect(useUIStore.getState().activeMobileTab).toBe('voice');
  });
});
