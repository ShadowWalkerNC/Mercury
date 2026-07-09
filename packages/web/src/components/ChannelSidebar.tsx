/**
 * ChannelSidebar — the second column (240px wide).
 *
 * Layout:
 *   Space name header (+ invite btn for owner)
 *   ├── TEXT CHANNELS  [+]
 *   │     # general
 *   │     # announcements
 *   ├── VOICE CHANNELS [+]
 *   │     🔊 voice-chat
 *   └── UserPanel (bottom-pinned)
 *
 * Channels are fetched from spaceStore on mount if not yet loaded.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpaceStore } from '@/stores/spaceStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import type { Channel } from '@mercury/shared';

interface Props { spaceId: string; }

export function ChannelSidebar({ spaceId }: Props) {
  const spaces        = useSpaceStore(s => s.spaces);
  const channels      = useSpaceStore(s => s.channels[spaceId] ?? []);
  const fetchChannels = useSpaceStore(s => s.fetchChannels);
  const { activeChannelId, setActiveChannel, openModal } = useUIStore();
  const user          = useAuthStore(s => s.user);
  const navigate      = useNavigate();

  const space   = spaces.find(s => s.id === spaceId);
  const isOwner = space?.owner_id === user?.id;

  useEffect(() => { fetchChannels(spaceId); }, [spaceId]);

  const textChannels  = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  function handleChannelClick(channel: Channel) {
    setActiveChannel(channel.id);
    navigate(`/channels/${spaceId}/${channel.id}`);
  }

  return (
    <aside style={css.sidebar}>
      {/* Header */}
      <header style={css.header}>
        <span style={css.spaceName}>{space?.name ?? '…'}</span>
        {isOwner && (
          <button style={css.headerBtn} title="Invite people"
            onClick={() => openModal('inviteMembers', { spaceId })}>
            <PersonAddIcon />
          </button>
        )}
      </header>

      {/* Channel list */}
      <div style={css.list}>
        {textChannels.length > 0 && (
          <>
            <CategoryLabel label="Text Channels" isOwner={isOwner}
              onAdd={() => openModal('createChannel', { spaceId, type: 'text' })} />
            {textChannels.map(ch => (
              <ChannelRow key={ch.id} channel={ch}
                active={ch.id === activeChannelId}
                onClick={() => handleChannelClick(ch)} />
            ))}
          </>
        )}
        {voiceChannels.length > 0 && (
          <>
            <CategoryLabel label="Voice Channels" isOwner={isOwner}
              onAdd={() => openModal('createChannel', { spaceId, type: 'voice' })} />
            {voiceChannels.map(ch => (
              <ChannelRow key={ch.id} channel={ch}
                active={ch.id === activeChannelId}
                onClick={() => handleChannelClick(ch)} />
            ))}
          </>
        )}
        {channels.length === 0 && (
          <p style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
            No channels yet.
          </p>
        )}
      </div>

      <div style={{ flex: 1 }} />
      <UserPanel />
    </aside>
  );
}

function CategoryLabel({ label, isOwner, onAdd }: { label: string; isOwner: boolean; onAdd: () => void }) {
  return (
    <div style={css.category}>
      <span style={css.categoryText}>{label}</span>
      {isOwner && (
        <button style={css.categoryAdd} title={`Create ${label}`} onClick={onAdd}>
          <SmallPlusIcon />
        </button>
      )}
    </div>
  );
}

function ChannelRow({ channel, active, onClick }: { channel: Channel; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-current={active ? 'page' : undefined}
      style={{
        ...css.channelRow,
        background: active ? 'var(--bg-hover)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}>
      <span style={{ flexShrink: 0, opacity: 0.7 }}>
        {channel.type === 'voice' ? <VoiceIcon /> : <HashIcon />}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {channel.name}
      </span>
    </button>
  );
}

function UserPanel() {
  const user   = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const open   = useUIStore(s => s.openModal);
  return (
    <div style={css.userPanel}>
      <div style={css.avatar}>
        {user?.avatar
          ? <img src={user.avatar} alt={user.username}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 14, fontWeight: 700 }}>{user?.username?.[0]?.toUpperCase()}</span>
        }
        <span style={css.statusDot} />
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.username}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.status ?? 'online'}</div>
      </div>
      <button title="User Settings" style={css.iconBtn} onClick={() => open('userSettings')}><CogIcon /></button>
      <button title="Log out"       style={css.iconBtn} onClick={logout}><LogoutIcon /></button>
    </div>
  );
}

// ─── SVG icons ───
function HashIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6.78 1.03a.75.75 0 0 1 .6.88L7.08 3.5h2.84l.35-1.72a.75.75 0 0 1 1.47.3L11.42 3.5H13a.75.75 0 0 1 0 1.5h-1.87l-.5 2.5H12a.75.75 0 0 1 0 1.5h-1.67l-.4 1.97a.75.75 0 0 1-1.47-.3l.35-1.67H6.0l-.4 1.97a.75.75 0 0 1-1.47-.3l.35-1.67H3a.75.75 0 0 1 0-1.5h1.78l.5-2.5H4a.75.75 0 0 1 0-1.5h1.58l.35-1.72a.75.75 0 0 1 .85-.65ZM6.28 5l-.5 2.5h2.84l.5-2.5H6.28Z"/>
  </svg>;
}
function VoiceIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11 1a1 1 0 0 0-1 1v12a1 1 0 1 0 2 0V2a1 1 0 0 0-1-1ZM4 5a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Zm3.5-2a1 1 0 0 0-1 1v8a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1Z"/>
  </svg>;
}
function SmallPlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <path d="M7 2a1 1 0 0 1 1 1v3h3a1 1 0 1 1 0 2H8v3a1 1 0 1 1-2 0V8H3a1 1 0 1 1 0-2h3V3a1 1 0 0 1 1-1Z"/>
  </svg>;
}
function PersonAddIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm2 0a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM19 10a1 1 0 0 1 1 1v2h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0v-2h-2a1 1 0 1 1 0-2h2v-2a1 1 0 0 1 1-1ZM2 20a6 6 0 0 1 11.16-3.063A8.001 8.001 0 0 0 4 24H2a1 1 0 0 1-1-1v-3Z"/>
  </svg>;
}
function CogIcon() {
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd"/>
  </svg>;
}
function LogoutIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 13v-2H7V8l-5 4 5 4v-3h9ZM20 3H10a2 2 0 0 0-2 2v4h2V5h10v14H10v-4H8v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"/>
  </svg>;
}

// ─── Styles ───
const css = {
  sidebar:     { width: 240, minWidth: 240, height: '100%', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  header:      { height: 48, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', gap: 8, flexShrink: 0 },
  spaceName:   { flex: 1, fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  headerBtn:   { color: 'var(--text-secondary)', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center' },
  list:        { flex: 1, overflowY: 'auto' as const, padding: '8px 0' },
  category:    { display: 'flex', alignItems: 'center', padding: '12px 8px 4px 16px', gap: 4 },
  categoryText:{ flex: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'var(--text-muted)' },
  categoryAdd: { color: 'var(--text-muted)', display: 'flex', alignItems: 'center', borderRadius: 'var(--radius-sm)', padding: 2 },
  channelRow:  { width: 'calc(100% - 16px)' as unknown as number, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 15, fontWeight: 500, cursor: 'pointer', transition: 'background 0.1s', textAlign: 'left' as const, margin: '1px 8px' },
  userPanel:   { height: 52, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', background: 'var(--bg-tertiary)', flexShrink: 0 },
  avatar:      { width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const, flexShrink: 0, overflow: 'hidden' },
  statusDot:   { position: 'absolute' as const, bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: 'var(--success)', border: '2px solid var(--bg-tertiary)' },
  iconBtn:     { color: 'var(--text-muted)', padding: 4, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center' },
} satisfies Record<string, React.CSSProperties>;
