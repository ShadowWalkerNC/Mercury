import type { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react';

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children:   ReactNode;
  fill?:      string;
  border?:    string;
  textColor?: string;
  size?:      'sm' | 'md' | 'lg';
  active?:    boolean;
  as?:        'button' | 'div' | 'span';
  style?:     CSSProperties;
}

const SIZE: Record<string, CSSProperties> = {
  sm: { fontSize: 'var(--text-xs)',  padding: '2px 10px',  height: 24 },
  md: { fontSize: 'var(--text-sm)',  padding: '4px 14px',  height: 30 },
  lg: { fontSize: 'var(--text-base)',padding: '6px 18px',  height: 36 },
};

/**
 * Pill — reusable capsule primitive.
 * Used for: command bar, input bar, tags, reaction chips, nav indicators.
 */
export function Pill({
  children,
  fill      = 'var(--glass-input)',
  border    = 'var(--border-violet)',
  textColor = 'var(--text-secondary)',
  size      = 'md',
  active    = false,
  as: Tag   = 'button',
  style,
  ...rest
}: PillProps) {
  const base: CSSProperties = {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   'var(--radius-pill)',
    border:         `1px solid ${active ? 'var(--border-strong)' : border}`,
    background:     active ? 'var(--accent-dim)' : fill,
    color:          active ? 'var(--text-accent)' : textColor,
    fontFamily:     'var(--font-sans)',
    fontWeight:     active ? 600 : 400,
    cursor:         Tag === 'button' ? 'pointer' : 'default',
    transition:     `background var(--duration-fast) var(--ease-snap),
                     border-color var(--duration-fast) var(--ease-snap),
                     color var(--duration-fast) var(--ease-snap)`,
    whiteSpace:     'nowrap',
    ...SIZE[size],
  };

  return (
    <Tag style={{ ...base, ...style }} {...(rest as any)}>
      {children}
    </Tag>
  );
}
