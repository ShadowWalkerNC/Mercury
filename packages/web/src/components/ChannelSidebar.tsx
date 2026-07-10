/**
 * ChannelSidebar — lists channels for a space.
 * Stage 6: all dead --bg-* / --border tokens replaced with
 * Command Stream equivalents. aria-labels added to icon buttons.
 * aria-current applied to active channel rows.
 */
import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSpaceStore } from '@/stores/spaceStore';
import { useUIStore } from '@/stores/uiStore';
import { useUnreadStore } from '@/stores/unreadStore';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from './ui/Badge';
import { gateway } from '@/lib/gateway';
import { WSOp } from '@mercury/shared';

interface Props { spaceId: string; }

export function ChannelSidebar({ spaceId }: Props) {
  const user          = useAuthStore(s => s.user);
  const channels      = useSpaceStore(s => s.channels[spaceId] ?? []);
  const fetchChannels = useSpaceStore(s => s.fetchChannels);
  const activeChannel = useUIStore(s => s.activeChannelId);
  const openModal     = useUIStore(s => s.openModal);
  const space         = useSpaceStore(s => s.spaces.find(sp => sp.id === spaceId));
  const { channels: unreadMap, increment, markRead } = useUnreadStore();
  const navigate      = useNavigate();

  useEffect(() => { fetchChannels(spaceId); }, [spaceId]);

  useEffect(() => {
    const off = gateway.on(WSOp.MESSAGE_CREATE, (p) => {
      const msg = p.d as { channel_id: string; author_id: string; content: string };
      if (msg.channel_id === activeChannel) return;
      const mentioned = !!(user?.username && msg.content.includes(`@${user.username}`));
      increment(msg.channel_id, mentioned);
    });
    return off;
  }, [activeChannel, user?.username]);

  useEffect(() => {
    if (activeChannel) markRead(activeChannel);
  }, [activeChannel]);

  const textChannels  = channels.filter(c => c.type === 'text');
  const voiceChannels = channels.filter(c => c.type === 'voice');

  function ChannelRow({ c }: { c: { id: string; name: string; type: string } }) {
    const u        = unreadMap[c.id];
    const unread   = u?.unread   ?? 0;
    const mentions = u?.mentions ?? 0;
    const isActive = c.id === activeChannel;
    const prefix   = c.type === 'voice' ? '🔊' : '#';

    return (
      <NavLink
        to={`/channels/${spaceId}/${c.id}`}
        aria-current={isActive ? 'page' : undefined}
        aria-label={`${c.type === 'voice' ? 'Voice' : 'Text'} channel: ${c.name}${
          mentions > 0 ? `, ${mentions} mention${mentions > 1 ? 's' : ''}` :
          unread   > 0 ? `, ${unread} unread` : ''
        }`}
        style={({ isActive: navActive }) => ({
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        'var(--space-1) var(--space-2)',
          borderRadius:   'var(--radius-sm)',
          textDecoration: 'none',
          gap:            'var(--space-2)',
          background:     navActive
            ? 'rgba(192, 132, 252, 0.12)'
            : 'transparent',
          borderLeft:     navActive
            ? '2px solid var(--accent)'
            : '2px solid transparent',
          color: unread > 0
            ? 'var(--text-primary)'
            : navActive
            ? 'var(--text-primary)'
            : 'var(--text-secondary)',
          fontWeight:     unread > 0 ? 700 : navActive ? 600 : 400,
          fontSize:       'var(--text-sm)',
          fontFamily:     'var(--font-sans)',
          transition:     `background var(--duration-instant) var(--ease-snap),
                           border-color var(--duration-instant) var(--ease-snap)`,
        })}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {prefix} {c.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', flexShrink: 0 }}>
          {mentions > 0 && <Badge count={mentions} max={9} variant="danger" style={{ minHeight: 'unset', minWidth: 'unset' }} />}
          {unread > 0 && mentions === 0 && (
            <span
              aria-hidden="true"
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--text-primary)',
                flexShrink: 0,
              }}
            />
          )}
        </div>
      </NavLink>
    );
  }

  return (
    <aside
      aria-label={`${space?.name ?? 'Space'} channels`}
      style={css.sidebar}
    >
      {/* Space header */}
      <div style={css.header}>
        <span style={css.spaceName}>{space?.name ?? '…'}</span>
        <button
          style={css.settingsBtn}
          aria-label={`${space?.name ?? 'Space'} settings`}
          onClick={() => openModal('settings', { spaceId } as never)}
        >
          ⚙️
        </button>
      </div>

      <div style={css.scroll} role="list" aria-label="Channels">
        {textChannels.length > 0 && (
          <section aria-label="Text channels">
            <div style={css.groupLabel} aria-hidden="true">Text Channels</div>
            {textChannels.map(c => <ChannelRow key={c.id} c={c} />)}
          </section>
        )}
        {voiceChannels.length > 0 && (
          <section aria-label="Voice channels" style={{ marginTop: 'var(--space-3)' }}>
            <div style={css.groupLabel} aria-hidden="true">Voice Channels</div>
            {voiceChannels.map(c => <ChannelRow key={c.id} c={c} />)}
          </section>
        )}
      </div>

      {/* Footer actions */}
      <div style={css.footer} role="toolbar" aria-label="Channel actions">
        <button
          style={css.footerBtn}
          aria-label="Create text channel"
          onClick={() => openModal('createChannel', { spaceId, type: 'text' })}
        >
          + Text
        </button>
        <button
          style={css.footerBtn}
          aria-label="Create voice channel"
          onClick={() => openModal('createChannel', { spaceId, type: 'voice' })}
        >
          + Voice
        </button>
        <button
          style={css.footerBtn}
          aria-label="Invite members to space"
          onClick={() => openModal('inviteMembers', { spaceId })}
        >
          Invite
        </button>
      </div>
    </aside>
  );
}

const css: Record<string, React.CSSProperties> = {
  sidebar: {
    width:          'var(--sidebar-width)',
    minWidth:       180,
    background:     'transparent',      // glass from ContentStream card
    display:        'flex',
    flexDirection:  'column',
    height:         '100%',
  },
  header: {
    height:        'var(--channel-header-height)',
    display:       'flex',
    alignItems:    'center',
    padding:       '0 var(--space-4)',
    borderBottom:  '1px solid var(--border-violet)',
    gap:           'var(--space-2)',
    flexShrink:    0,
  },
  spaceName: {
    fontWeight:    700,
    fontSize:      'var(--text-sm)',
    fontFamily:    'var(--font-sans)',
    letterSpacing: 'var(--tracking-wide)',
    color:         'var(--text-primary)',
    flex:          1,
    overflow:      'hidden',
    textOverflow:  'ellipsis',
    whiteSpace:    'nowrap',
  },
  settingsBtn: {
    background:   'transparent',
    border:       'none',
    cursor:       'pointer',
    fontSize:     16,
    color:        'var(--text-muted)',
    padding:      'var(--space-1)',
    borderRadius: 'var(--radius-xs)',
    flexShrink:   0,
    transition:   `color var(--duration-fast) var(--ease-snap)`,
  },
  scroll: {
    flex:       1,
    overflowY:  'auto',
    padding:    'var(--space-2) var(--space-2)',
  },
  groupLabel: {
    fontSize:      'var(--text-xs)',
    fontWeight:    700,
    fontFamily:    'var(--font-mono)',
    color:         'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-widest)',
    padding:       'var(--space-3) var(--space-2) var(--space-1)',
  },
  footer: {
    padding:       'var(--space-2)',
    borderTop:     '1px solid var(--border-violet)',
    display:       'flex',
    gap:           'var(--space-1)',
    flexWrap:      'wrap',
    flexShrink:    0,
  },
  footerBtn: {
    fontSize:      'var(--text-xs)',
    padding:       'var(--space-1) var(--space-3)',
    borderRadius:  'var(--radius-pill)',
    background:    'var(--glass-input)',
    border:        '1px solid var(--border-violet)',
    color:         'var(--text-secondary)',
    cursor:        'pointer',
    fontFamily:    'var(--font-sans)',
    transition:    `background var(--duration-fast) var(--ease-snap)`,
  },
};
