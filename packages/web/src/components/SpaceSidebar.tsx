/**
 * SpaceSidebar — the leftmost narrow column.
 *
 * Layout (top to bottom):
 *   • DMs button  (navigates to /channels/@me)
 *   • Divider
 *   • Space icons  (one per joined space, sorted by join order)
 *   • Add-space button
 *   • Divider
 *   • Settings cog (bottom-pinned)
 *
 * Active space gets a pill indicator on the left edge and a
 * slightly larger / rounded icon. Unread spaces get a small
 * white dot indicator.
 */
import { useNavigate } from 'react-router-dom';
import { useSpaceStore } from '@/stores/spaceStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import type { Space } from '@mercury/shared';

export function SpaceSidebar() {
  const spaces          = useSpaceStore(s => s.spaces);
  const { activeSpaceId, setActiveSpace, openModal } = useUIStore();
  const user            = useAuthStore(s => s.user);
  const navigate        = useNavigate();

  function handleSpaceClick(space: Space) {
    setActiveSpace(space.id);
    navigate(`/channels/${space.id}`);
  }

  function handleDmClick() {
    setActiveSpace(null);
    navigate('/channels/@me');
  }

  return (
    <nav style={css.rail} aria-label="Spaces">
      {/* DMs */}
      <SpaceIcon
        label="Direct Messages"
        active={activeSpaceId === null && location.pathname.startsWith('/channels/@me')}
        onClick={handleDmClick}
      >
        <DmIcon />
      </SpaceIcon>

      <Divider />

      {/* Space list */}
      {spaces.map(space => (
        <SpaceIcon
          key={space.id}
          label={space.name}
          active={space.id === activeSpaceId}
          onClick={() => handleSpaceClick(space)}
        >
          {space.icon
            ? <img src={space.icon} alt={space.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <AbbrevLabel name={space.name} />
          }
        </SpaceIcon>
      ))}

      {/* Add space */}
      <SpaceIcon
        label="Add a Space"
        active={false}
        onClick={() => openModal('createSpace')}
        variant="add"
      >
        <PlusIcon />
      </SpaceIcon>

      <div style={{ flex: 1 }} />
      <Divider />

      {/* Settings */}
      <SpaceIcon
        label={`Settings (${user?.username ?? ''})`}
        active={false}
        onClick={() => openModal('userSettings')}
        variant="settings"
      >
        <CogIcon />
      </SpaceIcon>

      <div style={{ height: 8 }} />
    </nav>
  );
}

// ─── SpaceIcon pill button ───

function SpaceIcon({
  children, label, active, onClick, variant,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: 'add' | 'settings';
}) {
  const isUtil = variant === 'add' || variant === 'settings';
  return (
    <div style={css.iconWrapper} title={label}>
      {/* Active pill indicator */}
      <span style={{
        ...css.pill,
        opacity: active ? 1 : 0,
        height:  active ? 40 : 8,
      }} />
      <button
        onClick={onClick}
        style={{
          ...css.iconBtn,
          borderRadius: active ? 'var(--radius-lg)' : '50%',
          background: isUtil
            ? 'var(--bg-tertiary)'
            : active
              ? 'var(--accent)'
              : 'var(--bg-secondary)',
          color: isUtil ? 'var(--success)' : 'var(--text-primary)',
        }}
        aria-label={label}
        aria-pressed={active}
      >
        {children}
      </button>
    </div>
  );
}

function AbbrevLabel({ name }: { name: string }) {
  const abbrev = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]!.toUpperCase())
    .join('');
  return <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>{abbrev}</span>;
}

function Divider() {
  return (
    <div style={{ width: 32, height: 2, background: 'var(--border)', borderRadius: 1, margin: '4px auto' }} />
  );
}

// ─── Inline SVG icons ───

function DmIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.268 2 11.5c0 2.07.666 3.993 1.8 5.57L2.1 21.35a.5.5 0 0 0 .64.64l4.32-1.68A10.45 10.45 0 0 0 12 21c5.523 0 10-4.268 10-9.5S17.523 2 12 2Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Styles ───

const css = {
  rail: {
    width: 72,
    minWidth: 72,
    height: '100%',
    background: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    paddingTop: 8,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
  },
  iconWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  pill: {
    position: 'absolute' as const,
    left: 0,
    width: 4,
    borderRadius: '0 4px 4px 0',
    background: 'var(--text-primary)',
    transition: 'height 0.15s ease, opacity 0.15s ease',
  },
  iconBtn: {
    width: 48,
    height: 48,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transition: 'border-radius 0.15s ease, background 0.15s ease',
    flexShrink: 0,
  },
} satisfies Record<string, React.CSSProperties>;
