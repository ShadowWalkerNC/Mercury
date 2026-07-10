import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders count', () => {
    render(<Badge count={5} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('renders nothing when count is 0', () => {
    const { container } = render(<Badge count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('caps at max (default 99)', () => {
    render(<Badge count={150} />);
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('caps at custom max', () => {
    render(<Badge count={20} max={9} />);
    expect(screen.getByText('9+')).toBeTruthy();
  });

  it('does not cap when count equals max', () => {
    render(<Badge count={9} max={9} />);
    expect(screen.getByText('9')).toBeTruthy();
  });

  it('has aria-label with count', () => {
    render(<Badge count={3} />);
    expect(screen.getByLabelText('3 unread')).toBeTruthy();
  });
});
