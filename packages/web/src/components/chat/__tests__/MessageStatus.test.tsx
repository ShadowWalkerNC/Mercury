import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageStatus } from '../MessageStatus';

describe('MessageStatus', () => {
  it('renders sending dot with aria-label', () => {
    render(<MessageStatus status="sending" />);
    expect(screen.getByLabelText('Sending')).toBeTruthy();
  });

  it('renders sent checkmark with aria-label', () => {
    render(<MessageStatus status="sent" />);
    expect(screen.getByLabelText('Sent')).toBeTruthy();
  });

  it('renders failed state with retry button', () => {
    render(<MessageStatus status="failed" />);
    const btn = screen.getByLabelText('Message failed to send. Click to retry.');
    expect(btn).toBeTruthy();
  });

  it('calls onRetry when failed button clicked', () => {
    const onRetry = vi.fn();
    render(<MessageStatus status="failed" onRetry={onRetry} />);
    fireEvent.click(screen.getByLabelText('Message failed to send. Click to retry.'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not render a button for sending state', () => {
    render(<MessageStatus status="sending" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('does not render a button for sent state', () => {
    render(<MessageStatus status="sent" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
