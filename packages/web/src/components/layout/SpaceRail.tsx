import { useUIStore } from '../../stores/uiStore';
import { useSpaceStore } from '../../stores/spaceStore';

/**
 * SpaceRail — desktop-only vertical icon rail (left edge).
 * Hidden on mobile/tablet via .desktop-only CSS utility class.
 * Each space is a circular pill; active space shows a fuchsia indicator bar.
 */
export function SpaceRail() {
  const spaces = useSpaceStore(s => s.spaces);
  const activeSpaceId = useUIStore(s => s.activeSpaceId);
  const setActiveSpace = useUIStore(s => s.setActiveSpace);

  return (
    <nav
      className="desktop-only"
      style={styles.rail}
      aria-label="Spaces"
    >
      <div style={styles.label}>SPACES</div>

      <ul style={styles.list} role="list">
        {spaces.map(space => {
          const active = space.id === activeSpaceId;
          const initials = space.name
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <li key={space.id} style={styles.item}>
              {/* Active indicator bar */}
              {active && <div style={styles.activeBar} aria-hidden="true" />}

              <button
                style={{
                  ...styles.iconBtn,
                  background: active
                    ? 'rgba(140, 60, 255, 0.26)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: `1.5px solid ${
                    active
                      ? 'rgba(160, 90, 255, 0.90)'
                      : 'rgba(180, 120, 255, 0.18)'
                  }`,
                  color: active
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 500,
                }}
                onClick={() => setActiveSpace(space.id)}
                aria-label={`Switch to ${space.name} space`}
                aria-current={active ? 'page' : undefined}
                title={space.name}
              >
                {initials}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  rail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-3)',
    width: 68,
    flexShrink: 0,
    padding: 'var(--space-4) 0',
    position: 'relative',
    zIndex: 'var(--z-panel)' as any,
  },
  label: {
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
    letterSpacing: 'var(--tracking-widest)',
    marginBottom: 'var(--space-2)',
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-3)',
    width: '100%',
  },
  item: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 28,
    borderRadius: '0 3px 3px 0',
    background: 'var(--accent-bright)',
    boxShadow: '0 0 8px var(--accent)',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 'var(--radius-icon)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--text-sm)',
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
    transition: `background var(--duration-fast) var(--ease-snap),
                 border-color var(--duration-fast) var(--ease-snap),
                 transform   var(--duration-fast) var(--ease-snap)`,
    flexShrink: 0,
  },
};
