import type { CSSProperties, ReactNode } from 'react';

interface GlassCardProps {
  children:    ReactNode;
  radius?:     string;
  fill?:       string;
  border?:     string;
  padding?:    string;
  style?:      CSSProperties;
  className?:  string;
  as?:         keyof JSX.IntrinsicElements;
}

/**
 * GlassCard — reusable glass surface primitive.
 * Defaults to --glass-base fill, --border-violet border, --radius-card radius.
 * backdrop-filter applied inline so it works in any stacking context.
 */
export function GlassCard({
  children,
  radius  = 'var(--radius-card)',
  fill    = 'var(--glass-base)',
  border  = 'var(--border-violet)',
  padding = 'var(--space-4)',
  style,
  className,
  as: Tag = 'div',
}: GlassCardProps) {
  const base: CSSProperties = {
    background:           fill,
    backdropFilter:       'blur(20px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
    border:               `1px solid ${border}`,
    borderRadius:         radius,
    padding,
  };

  return (
    <Tag className={className} style={{ ...base, ...style }}>
      {children}
    </Tag>
  );
}
