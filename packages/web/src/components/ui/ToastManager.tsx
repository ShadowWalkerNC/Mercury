import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore, type Toast } from '../../stores/uiStore';

const VARIANT_STYLES: Record<string, { border: string; icon: string; glow: string }> = {
  success: { border: 'var(--accent-emerald)',  icon: '✓', glow: 'rgba(16,201,122,0.18)' },
  error:   { border: 'var(--danger)',           icon: '✕', glow: 'rgba(248,113,113,0.18)' },
  info:    { border: 'var(--accent-cyan)',      icon: 'ℹ', glow: 'rgba(34,211,238,0.18)' },
  warning: { border: 'var(--warning)',          icon: '⚠', glow: 'rgba(251,191,36,0.18)'  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismissToast = useUIStore(s => s.dismissToast);
  const v = VARIANT_STYLES[toast.variant];

  useEffect(() => {
    if (toast.duration === 0) return;
    const t = setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration]);

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            'var(--space-3)',
        padding:        'var(--space-3) var(--space-4)',
        background:     'var(--glass-elevated)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        border:         `1px solid ${v.border}`,
        borderRadius:   'var(--radius-pill)',
        boxShadow:      `0 4px 24px ${v.glow}, var(--shadow-md)`,
        minWidth:       280,
        maxWidth:       420,
        pointerEvents:  'auto',
        animation:      'toast-in 0.18s var(--ease-bounce) forwards',
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0, color: v.border }}>{v.icon}</span>
      <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
        {toast.message}
      </span>
      <button
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: 16, padding: '2px 4px',
          borderRadius: 'var(--radius-xs)', flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

/**
 * ToastManager — renders toast queue into #toast-root portal.
 * Desktop: bottom-right. Mobile: bottom-center (via CSS).
 * Must be mounted once inside AppShell.
 */
export function ToastManager() {
  const toastQueue = useUIStore(s => s.toastQueue);
  const target     = typeof document !== 'undefined'
    ? document.getElementById('toast-root')
    : null;

  if (!target) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)      scale(1);    }
        }
        @media (max-width: 479px) {
          #toast-root {
            left: 16px !important;
            right: 16px !important;
            bottom: calc(var(--mobile-nav-height) + 16px) !important;
            align-items: center;
          }
        }
      `}</style>
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           'var(--space-2)',
          alignItems:    'flex-end',
          pointerEvents: 'none',
        }}
      >
        {toastQueue.map(t => <ToastItem key={t.id} toast={t} />)}
      </div>
    </>,
    target,
  );
}
