import type { CSSProperties, ReactNode } from 'react';
import { GlassCard } from './GlassCard';
import { Pill } from './Pill';

interface EmptyStateProps {
  icon:        ReactNode;
  headline:    string;
  description?: string;
  ctaLabel?:   string;
  onCta?:      () => void;
  style?:      CSSProperties;
}

/**
 * EmptyState — reusable zero-data placeholder.
 * Used for: new users with no spaces, empty channels, no DMs.
 * Renders a centred glass card with icon, headline, optional description + CTA.
 */
export function EmptyState({
  icon, headline, description, ctaLabel, onCta, style,
}: EmptyStateProps) {
  return (
    <div style={{ ...styles.wrapper, ...style }}>
      <GlassCard
        radius="var(--radius-card)"
        fill="var(--glass-panel)"
        border="var(--border-violet)"
        padding="var(--space-10) var(--space-8)"
        style={styles.card}
      >
        <div style={styles.icon} aria-hidden="true">{icon}</div>
        <h2 style={styles.headline}>{headline}</h2>
        {description && <p style={styles.description}>{description}</p>}
        {ctaLabel && onCta && (
          <Pill
            as="button"
            size="lg"
            active
            onClick={onCta}
            style={{ marginTop: 'var(--space-6)' }}
          >
            {ctaLabel}
          </Pill>
        )}
      </GlassCard>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          '100%',
    height:         '100%',
    padding:        'var(--space-8)',
  },
  card: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    textAlign:      'center',
    maxWidth:       420,
    boxShadow:      'var(--shadow-accent)',
  },
  icon: {
    fontSize:     48,
    marginBottom: 'var(--space-4)',
    opacity:      0.75,
  },
  headline: {
    fontSize:      'var(--text-xl)',
    fontWeight:    700,
    color:         'var(--text-primary)',
    fontFamily:    'var(--font-sans)',
    letterSpacing: 'var(--tracking-wide)',
    marginBottom:  'var(--space-2)',
  },
  description: {
    fontSize:   'var(--text-sm)',
    color:      'var(--text-secondary)',
    fontFamily: 'var(--font-sans)',
    lineHeight: 'var(--leading-relaxed)',
  },
};
