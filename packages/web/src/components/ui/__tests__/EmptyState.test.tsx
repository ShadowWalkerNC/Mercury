import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders icon and headline', () => {
    render(<EmptyState icon="📦" headline="No channels yet" />);
    expect(screen.getByText('No channels yet')).toBeTruthy();
    expect(screen.getByText('📦')).toBeTruthy();
  });

  it('renders optional description', () => {
    render(
      <EmptyState
        icon="✉"
        headline="No DMs"
        description="Start a conversation"
      />
    );
    expect(screen.getByText('Start a conversation')).toBeTruthy();
  });

  it('renders CTA button when ctaLabel + onCta provided', () => {
    const fn = { called: false };
    render(
      <EmptyState
        icon="+"
        headline="Create space"
        ctaLabel="Create"
        onCta={() => { fn.called = true; }}
      />
    );
    fireEvent.click(screen.getByText('Create'));
    expect(fn.called).toBe(true);
  });

  it('does not render CTA button without ctaLabel', () => {
    render(<EmptyState icon="∅" headline="Empty" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
