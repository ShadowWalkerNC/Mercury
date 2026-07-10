import { createPortal } from 'react-dom';
import { GlassCard } from './GlassCard';
import { Pill } from './Pill';

interface ConfirmModalProps {
  title:       string;
  description: string;
  confirmLabel?: string;
  cancelLabel?:  string;
  danger?:       boolean;
  onConfirm:   () => void;
  onCancel:    () => void;
}

/**
 * ConfirmModal — destructive action confirmation.
 * Used for: delete channel, leave space, revoke invite.
 * Renders into #modal-root portal.
 * danger=true swaps confirm button to --danger color.
 */
export function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  danger       = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const target = typeof document !== 'undefined'
    ? document.getElementById('modal-root')
    : null;

  const content = (
    <>
      {/* Backdrop */}
      <div
        style={styles.backdrop}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        style={styles.positioner}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        <GlassCard
          fill="var(--glass-elevated)"
          radius="var(--radius-modal)"
          border={danger ? 'var(--border-danger)' : 'var(--border-violet)'}
          padding="var(--space-8)"
          style={styles.card}
        >
          <h2 id="confirm-title" style={styles.title}>{title}</h2>
          <p  id="confirm-desc"  style={styles.desc}>{description}</p>

          <div style={styles.actions}>
            <Pill as="button" size="lg" onClick={onCancel}>{cancelLabel}</Pill>
            <Pill
              as="button"
              size="lg"
              active={!danger}
              style={danger ? styles.dangerBtn : undefined}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Pill>
          </div>
        </GlassCard>
      </div>
    </>
  );

  return target ? createPortal(content, target) : content;
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.60)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    zIndex: 'var(--z-overlay)' as any,
    pointerEvents: 'auto',
  },
  positioner: {
    position:  'fixed',
    top:       '50%',
    left:      '50%',
    transform: 'translate(-50%, -50%)',
    width:     'min(440px, calc(100vw - 32px))',
    zIndex:    'var(--z-modal)' as any,
    pointerEvents: 'auto',
  },
  card:    { boxShadow: 'var(--shadow-lg)' },
  title: {
    fontSize:      'var(--text-lg)',
    fontWeight:    700,
    color:         'var(--text-primary)',
    fontFamily:    'var(--font-sans)',
    letterSpacing: 'var(--tracking-wide)',
    marginBottom:  'var(--space-3)',
  },
  desc: {
    fontSize:   'var(--text-sm)',
    color:      'var(--text-secondary)',
    fontFamily: 'var(--font-sans)',
    lineHeight: 'var(--leading-relaxed)',
    marginBottom: 'var(--space-6)',
  },
  actions: {
    display:        'flex',
    justifyContent: 'flex-end',
    gap:            'var(--space-3)',
  },
  dangerBtn: {
    background:  'var(--danger-dim)',
    borderColor: 'var(--border-danger)',
    color:       'var(--text-danger)',
  },
};
