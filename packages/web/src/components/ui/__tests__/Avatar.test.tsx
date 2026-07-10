import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('renders uppercase initial when no src', () => {
    render(<Avatar name="shadowwalker" />);
    expect(screen.getByText('S')).toBeTruthy();
  });

  it('renders img when src is provided', () => {
    render(<Avatar name="shadow" src="https://example.com/avatar.png" />);
    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
    expect((img as HTMLImageElement).src).toContain('avatar.png');
  });

  it('renders presence dot for online status', () => {
    render(<Avatar name="shadow" presence="online" />);
    expect(screen.getByLabelText('Status: online')).toBeTruthy();
  });

  it('renders presence dot for idle status', () => {
    render(<Avatar name="shadow" presence="idle" />);
    expect(screen.getByLabelText('Status: idle')).toBeTruthy();
  });

  it('does not render presence dot for offline', () => {
    render(<Avatar name="shadow" presence="offline" />);
    expect(screen.queryByLabelText('Status: offline')).toBeNull();
  });

  it('does not render presence dot when presence is undefined', () => {
    const { container } = render(<Avatar name="shadow" />);
    // No element with aria-label matching Status:
    expect(container.querySelector('[aria-label^="Status:"]')).toBeNull();
  });

  it('handles empty name gracefully', () => {
    render(<Avatar name="" />);
    expect(screen.getByText('?')).toBeTruthy();
  });
});
