import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Suppress console.error noise from intentional throws
const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test explosion');
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('renders fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Test explosion')).toBeTruthy();
  });

  it('renders custom fallbackLabel', () => {
    render(
      <ErrorBoundary fallbackLabel="Mercury crashed">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Mercury crashed')).toBeTruthy();
  });

  it('Try again button resets boundary state', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Try again'));
    // After reset, boundary renders children again (no longer throwing in rerender)
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('Reload page button is present', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Reload page')).toBeTruthy();
  });
});
