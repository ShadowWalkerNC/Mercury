import type { CSSProperties } from 'react';

interface BadgeProps {
  count:    number;
  max?:     number;
  variant?: 'accent' | 'danger' | 'emerald';
  style?:   CSSProperties;
}

const VARIANT: Record<string, { bg: string; color: string }> = {
  accent:  { bg: 'var(--accent)',         color: '#fff' },
  danger:  { bg: 'var(--danger)',         color: '#fff' },
  emerald: { bg: 'var(--accent-emerald)', color: '#fff' },
};

/**
 * Badge — unread count pill.
 * Renders nothing when count === 0.
 * Caps display at max (default 99).
 */
export function Badge({ count, max = 99, variant = 'accent', style }: BadgeProps) {
  if (count === 0) return null;
  const { bg, color } = VARIANT[variant];
  const label = count > max ? `${max}+` : String(count);

  return (
    <span
      aria-label={`${count} unread`}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        minWidth:       18,
        height:         18,
        padding:        '0 5px',
        borderRadius:   'var(--radius-pill)',
        background:     bg,
        color,
        fontSize:       'var(--text-xs)',
        fontFamily:     'var(--font-sans)',
        fontWeight:     700,
        lineHeight:     1,
        boxShadow:      `0 0 8px ${bg}55`,
        flexShrink:     0,
        ...style,
      }}
    >
      {label}
    </span>
  );
}
