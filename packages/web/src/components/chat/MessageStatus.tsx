import type { CSSProperties } from 'react';

export type SendStatus = 'sending' | 'sent' | 'failed';

interface MessageStatusProps {
  status:  SendStatus;
  onRetry?: () => void;
}

/**
 * MessageStatus — per-message send status indicator.
 * sending → muted animated dot
 * sent    → faint checkmark (auto-fades after 2s via CSS)
 * failed  → red “Failed · Retry” pill button
 */
export function MessageStatus({ status, onRetry }: MessageStatusProps) {
  if (status === 'sending') {
    return (
      <span style={styles.sending} aria-label="Sending">
        <span style={styles.dot} />
      </span>
    );
  }

  if (status === 'sent') {
    return (
      <span style={styles.sent} aria-label="Sent">
        ✓
      </span>
    );
  }

  // failed
  return (
    <button
      style={styles.failedBtn}
      onClick={onRetry}
      aria-label="Message failed to send. Click to retry."
    >
      ⚠ Failed · Retry
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  sending: {
    display:    'inline-flex',
    alignItems: 'center',
    marginLeft: 'var(--space-2)',
  },
  dot: {
    display:         'inline-block',
    width:           6,
    height:          6,
    borderRadius:    '50%',
    background:      'var(--text-muted)',
    animation:       'pulse 1.2s ease-in-out infinite',
  },
  sent: {
    fontSize:   'var(--text-xs)',
    color:      'var(--accent-emerald)',
    marginLeft: 'var(--space-2)',
    opacity:    0.6,
    fontFamily: 'var(--font-mono)',
  },
  failedBtn: {
    display:      'inline-flex',
    alignItems:   'center',
    gap:          'var(--space-1)',
    marginLeft:   'var(--space-2)',
    fontSize:     'var(--text-xs)',
    fontFamily:   'var(--font-sans)',
    color:        'var(--text-danger)',
    background:   'var(--danger-dim)',
    border:       '1px solid var(--border-danger)',
    borderRadius: 'var(--radius-pill)',
    padding:      '2px 10px',
    cursor:       'pointer',
    transition:   `background var(--duration-fast) var(--ease-snap)`,
  },
};
