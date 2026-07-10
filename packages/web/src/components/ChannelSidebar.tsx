/**
 * ChannelSidebar — lists channels for a space.
 * M-051: shows unread dot + mention badge per channel.
 */
import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSpaceStore } from '@/stores/spaceStore';
import { useUIStore } from '@/stores/uiStore';
import { useUnreadStore } from '@/stores/unreadStore';
import { useAuthStore } from '@/stores/authStore';
import { gateway } from '@/lib/gateway';
import { WSOp } from '@mercury/shared';

interface Props { spaceId: string; }

export function ChannelSidebar({ spaceId }: Props) {
  const user         = useAuthStore(s => s.user);
  const channels     = useSpaceStore(s => s.channels[spaceId] ?? []);
  const fetchChannels = useSpaceStore(s => s.fetchChannels);
  const activeChannel = useUIStore(s => s.activeChannelId);
  const openModal    = useUIStore(s => s.openModal);
  const space        = useSpaceStore(s => s.spaces.find(sp => sp.id === spaceId));
  const { channels: unreadMap, increment, markRead } = useUnreadStore();
  const navigate     = useNavigate();

  useEffect(() => { fetchChannels(spaceId); }, [spaceId]);

  // Drive unread increments from WS (only for non-active channels)
  useEffect(() => {
    const off = gateway.on(WSOp.MESSAGE_CREATE, (p) => {
      const msg = p.d as { channel_id: string; author_id: string; content: string };
      if (msg.channel_id === activeChannel) return;   // already reading
      const mentioned = !!(user?.username && msg.content.includes(`@${user.username}`));
      increment(msg.channel_id, mentioned);
    });
    return off;
  }, [activeChannel, user?.username]);

  // Mark active channel read
  useEffect(() => {
    if (activeChannel) markRead(activeChannel);
  }, [activeChannel]);

  const textChannels  = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  function ChannelRow({ c }: { c: { id: string; name: string; type: string } }) {
    const u        = unreadMap[c.id];
    const unread   = u?.unread   ?? 0;
    const mentions = u?.mentions ?? 0;
    const prefix   = c.type === 'voice' ? '🔊' : '#';

    return (
      <NavLink
        to={`/channels/${spaceId}/${c.id}`}
        style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 8px', borderRadius: 'var(--radius-sm)', textDecoration: 'none', gap: 6,
          background: isActive ? 'var(--bg-active)' : 'transparent',
          color: unread > 0 ? 'var(--text-primary)' : isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontWeight: unread > 0 ? 700 : isActive ? 600 : 400,
        })}
      >
        <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {prefix} {c.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {mentions > 0 && (
            <span style={css.mentionBadge}>{mentions > 9 ? '9+' : mentions}</span>
          )}
          {unread > 0 && mentions === 0 && (
            <span style={css.unreadDot} />
          )}
        </div>
      </NavLink>
    );
  }

  return (
    <aside style={css.sidebar}>
      {/* Space header */}
      <div style={css.header}>
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {space?.name ?? '…'}
        </span>
        <button
          style={css.settingsBtn}
          title="Space settings"
          onClick={() => openModal('settings', { spaceId })}
        >&#9881;</button>
      </div>

      <div style={css.scroll}>
        {textChannels.length > 0 && (
          <>
            <div style={css.groupLabel}>Text Channels</div>
            {textChannels.map(c => <ChannelRow key={c.id} c={c} />)}
          </>
        )}
        {voiceChannels.length > 0 && (
          <>
            <div style={css.groupLabel}>Voice Channels</div>
            {voiceChannels.map(c => <ChannelRow key={c.id} c={c} />)}
          </>
        )}
      </div>

      {/* Footer actions */}
      <div style={css.footer}>
        <button style={css.footerBtn} onClick={() => openModal('createChannel', { spaceId, type: 'text' })}>
          + Text Channel
        </button>
        <button style={css.footerBtn} onClick={() => openModal('createChannel', { spaceId, type: 'voice' })}>
          + Voice
        </button>
        <button style={css.footerBtn} onClick={() => openModal('inviteMembers', { spaceId })}>
          Invite
        </button>
      </div>
    </aside>
  );
}

const css: Record<string, React.CSSProperties> = {
  sidebar:     { width: 240, minWidth: 240, background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' },
  header:      { height: 48, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid var(--border)', gap: 8, flexShrink: 0 },
  settingsBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: 4, borderRadius: 'var(--radius-sm)', flexShrink: 0 },
  scroll:      { flex: 1, overflowY: 'auto', padding: '8px 6px' },
  groupLabel:  { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 8px 4px' },
  footer:      { padding: '8px 8px', borderTop: '1px solid var(--border)', display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 },
  footerBtn:   { fontSize: 11, padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' },
  mentionBadge:{ minWidth: 18, height: 18, borderRadius: 9, background: 'var(--danger)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' },
  unreadDot:   { width: 8, height: 8, borderRadius: '50%', background: 'var(--text-primary)' },
};
