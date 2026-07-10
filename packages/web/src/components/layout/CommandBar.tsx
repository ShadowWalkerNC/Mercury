import { useUIStore } from '../../stores/uiStore';

/**
 * CommandBar — global ⌘K pill pinned to the top of the viewport.
 * On desktop: centered, max-width 560px.
 * On mobile: full width minus 32px padding.
 * Clicking opens the CommandPalette via uiStore.
 */
export function CommandBar() {
  const openCommandBar = useUIStore(s => s.openCommandBar);
  const commandBarOpen = useUIStore(s => s.commandBarOpen);

  return (
    <div style={styles.wrapper}>
      <button
        style={{
          ...styles.pill,
          borderColor: commandBarOpen
            ? 'var(--border-strong)'
            : 'var(--border-violet)',
          boxShadow: commandBarOpen
            ? '0 0 0 3px var(--accent-dim)'
            : 'var(--shadow-sm)',
        }}
        onClick={openCommandBar}
        aria-label="Open command palette (⌘K)"
        aria-keyshortcuts="Meta+k Control+k"
      >
        <span style={styles.icon}>⌘</span>
        <span style={styles.placeholder}>Search, jump, or command…</span>
        <kbd style={styles.kbd}>⌘K</kbd>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(560px, calc(100vw - 32px))',
    zIndex: 'var(--z-header)' as any,
    pointerEvents: 'auto',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    width: '100%',
    height: 'var(--command-bar-height)',
    padding: '0 var(--space-4)',
    background: 'var(--glass-input)',
    backdropFilter: 'blur(20px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
    border: '1px solid var(--border-violet)',
    borderRadius: 'var(--radius-pill)',
    cursor: 'text',
    transition: `border-color var(--duration-fast) var(--ease-snap),
                 box-shadow   var(--duration-fast) var(--ease-snap)`,
  },
  icon: {
    fontSize: 'var(--text-base)',
    color: 'var(--text-accent)',
    opacity: 0.7,
    flexShrink: 0,
  },
  placeholder: {
    flex: 1,
    textAlign: 'left',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-placeholder)',
    letterSpacing: 'var(--tracking-wide)',
  },
  kbd: {
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-accent)',
    opacity: 0.55,
    background: 'var(--accent-dim)',
    border: '1px solid var(--border-violet)',
    borderRadius: 'var(--radius-xs)',
    padding: '2px 6px',
    flexShrink: 0,
  },
};
