import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pill } from '../Pill';

describe('Pill', () => {
  it('renders children', () => {
    render(<Pill>Click me</Pill>);
    expect(screen.getByText('Click me')).toBeTruthy();
  });

  it('renders as button by default', () => {
    render(<Pill>btn</Pill>);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('renders as div when as="div"', () => {
    const { container } = render(<Pill as="div">tag</Pill>);
    expect(container.querySelector('div')).toBeTruthy();
    expect(container.querySelector('button')).toBeNull();
  });

  it('fires onClick', () => {
    let clicked = false;
    render(<Pill onClick={() => { clicked = true; }}>go</Pill>);
    fireEvent.click(screen.getByText('go'));
    expect(clicked).toBe(true);
  });

  it('active prop changes visual state (border-color in style)', () => {
    const { container } = render(<Pill active>active</Pill>);
    const el = container.firstChild as HTMLElement;
    // active sets border to --border-strong
    expect(el.style.borderColor).not.toBe('');
  });

  it('disabled button is not interactive', () => {
    render(<Pill disabled>locked</Pill>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
