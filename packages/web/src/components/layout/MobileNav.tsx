import { useUIStore } from '../../stores/uiStore';

type Tab = 'spaces' | 'channels' | 'dms' | 'voice' | 'you';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'spaces',   icon: '⊞', label: 'Spaces'   },
  { id: 'channels', icon: '#', label: 'Channels' },
  { id: 'dms',      icon: '✉', label: 'DMs'       },
  { id: 'voice',    icon: '◎', label: 'Voice'     },
  { id: 'you',      icon: '◉', label: 'You'       },
];

/**
 * MobileNav — fixed bottom tab bar, mobile-only.
 * Hidden on desktop via .mobile-nav CSS class (see breakpoints.css).
 * Active tab uses fuchsia color + subtle pill underline indicator.
 */
export function MobileNav() {
  const activeMobileTab = useUIStore(s => s.activeMobileTab);
  const setActiveMobileTab = useUIStore(s => s.setActiveMobileTab);

  return (
    <nav
      className="mobile-nav glass-nav"
      style={styles.nav}
      aria-label="Main navigation"
    >
      {TABS.map(tab => {
        const active = tab.id === activeMobileTab;
        return (
          <button
            key={tab.id}
            style={styles.tab}
            onClick={() => setActiveMobileTab(tab.id)}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
          >
            {/* Active indicator pill */}
            {active && <div style={styles.activeIndicator} aria-hidden="true" />}

            <span
              style={{
                ...styles.icon,
                color: active ? 'var(--accent-bright)' : 'var(--text-muted)',
              }}
            >
              {tab.icon}
            </span>
            <span
              style={{
                ...styles.tabLabel,
                color: active ? 'var(--text-accent)' : 'var(--text-muted)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    bottom: 12,
    left: 16,
    right: 16,
    height: 'var(--mobile-nav-height)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 'var(--z-nav)' as any,
    // glass-nav class handles background + backdrop-filter + border-radius
  },
  tab: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: 'var(--space-2) var(--space-3)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 'var(--radius-sm)',
    transition: `color var(--duration-fast) var(--ease-snap)`,
    minWidth: 52,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 32,
    height: 3,
    borderRadius: '0 0 var(--radius-pill) var(--radius-pill)',
    background: 'var(--accent)',
    boxShadow: '0 0 8px var(--accent-dim)',
  },
  icon: {
    fontSize: 18,
    lineHeight: 1,
    transition: `color var(--duration-fast) var(--ease-snap)`,
  },
  tabLabel: {
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-sans)',
    letterSpacing: 'var(--tracking-wide)',
    transition: `color var(--duration-fast) var(--ease-snap)`,
  },
};
