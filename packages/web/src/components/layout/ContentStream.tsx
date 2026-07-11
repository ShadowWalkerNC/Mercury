import { useUIStore } from '../../stores/uiStore';
import { ChannelSidebar } from '../ChannelSidebar';
import { ChatArea } from '../ChatArea';
import { VoiceArea } from '../VoiceArea';
import { MemberList } from '../MemberList';

/**
 * ContentStream — fluid glass card wrapping the active view.
 *
 * Desktop layout (inside glass card):
 *   [ChannelSidebar] | [ChatArea or VoiceArea] | [MemberList]
 *
 * Mobile layout:
 *   Single column — active panel determined by MobileNav tab.
 *   ChannelSidebar and MemberList hidden; only chat/voice canvas shown.
 *
 * The outer wrapper fills remaining space after SpaceRail.
 * The inner glass card has 28px radius and backdrop-filter.
 */
export function ContentStream() {
  const activeSpaceId = useUIStore(s => s.activeSpaceId);
  const activeChannelId = useUIStore(s => s.activeChannelId);
  const activeChannelType = useUIStore(s => s.activeChannelType);

  return (
    <div style={styles.wrapper}>
      <div className="glass" style={styles.card}>

        {/* Channel list sidebar — hidden on mobile */}
        <div className="desktop-only" style={styles.sidebar}>
          {activeSpaceId && <ChannelSidebar spaceId={activeSpaceId} />}
        </div>

        {/* Main content area */}
        <main style={styles.main} role="main">
          {activeSpaceId && activeChannelId ? (
            activeChannelType === 'voice'
              ? <VoiceArea spaceId={activeSpaceId} channelId={activeChannelId} />
              : <ChatArea spaceId={activeSpaceId} channelId={activeChannelId} />
          ) : (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Select a channel to get started.
            </div>
          )}
        </main>

        {/* Presence / member list — hidden on tablet + mobile */}
        <div className="presence-panel desktop-only" style={styles.presence}>
          {activeSpaceId && <MemberList spaceId={activeSpaceId} />}
        </div>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '0 var(--space-4) var(--space-4)',
    minWidth: 0,
    height: '100%',
  },
  card: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 0,
    // glass class handles bg, backdrop-filter, border, border-radius
  },
  sidebar: {
    width: 'var(--sidebar-width)',
    flexShrink: 0,
    borderRight: '1px solid var(--border-violet)',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  presence: {
    width: 'var(--presence-width)',
    flexShrink: 0,
    borderLeft: '1px solid var(--border-violet)',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
};
