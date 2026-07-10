/**
 * SpaceSidebar — far-left column of space icons.
 * M-051: shows aggregated unread dot on each space icon.
 */
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSpaceStore } from '@/stores/spaceStore';
import { useUIStore } from '@/stores/uiStore';
import { useUnreadStore } from '@/stores/unreadStore';

export function SpaceSidebar() {
  const spaces     = useSpaceStore(s => s.spaces);
  const { spaceId} = useParams<{ spaceId?: string }>();
  const openModal  = useUIStore(s => s.openModal);
  const navigate   = useNavigate();
  const unreadMap  = useUnreadStore(s => s.channels);
  const channels   = useSpaceStore(s => s.channels);

  function spaceHasUnread(sid: string) {
    const ids = (channels[sid] ?? []).map((c: { id: string }) => c.id);
    return ids.some(id => (unreadMap[id]?.unread ?? 0) > 0);
  }

  function spaceHasMention(sid: string) {
    const ids = (channels[sid] ?? []).map((c: { id: string }) => c.id);
    return ids.some(id => (unreadMap[id]?.mentions ?? 0) > 0);
  }

  return (
    <aside style={css.sidebar}>
      {/* DM button */}
      <button
        style={{ ...css.icon, background: spaceId === '@me' ? 'var(--accent)' : 'var(--bg-tertiary)' }}
        title="Direct Messages"
        onClick={() => navigate('/channels/@me')}
      >
        ✉️
      </button>

      <div style={css.divider} />

      {spaces.map(sp => {
        const active   = sp.id === spaceId;
        const hasUnread  = spaceHasUnread(sp.id);
        const hasMention = spaceHasMention(sp.id);
        const initial  = sp.name[0]?.toUpperCase() ?? '?';

        return (
          <div key={sp.id} style={{ position: 'relative' }}>
            <button
              style={{
                ...css.icon,
                background: active ? 'var(--accent)' : 'var(--bg-tertiary)',
                outline: active ? '2px solid var(--accent)' : 'none',
                outlineOffset: 2,
              }}
              title={sp.name}
              onClick={() => navigate(`/channels/${sp.id}`)}
            >
              {sp.icon
                ? <img src={sp.icon} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} alt={sp.name} />
                : <span style={{ fontSize: 18, fontWeight: 700 }}>{initial}</span>
              }
            </button>
            {/* Unread indicator */}
            {!active && hasUnread && (
              <span style={hasMention ? css.mentionPip : css.unreadPip} />
            )}
          </div>
        );
      })}

      <button style={{ ...css.icon, background: 'var(--bg-tertiary)', marginTop: 4 }}
        title="Create Space" onClick={() => openModal('createSpace', {})}>
        +
      </button>
    </aside>
  );
}

const css: Record<string, React.CSSProperties> = {
  sidebar:    { width: 68, minWidth: 68, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 6, borderRight: '1px solid var(--border)', overflowY: 'auto' },
  icon:       { width: 44, height: 44, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', fontSize: 20, color: 'var(--text-primary)', transition: 'border-radius 0.15s, background 0.15s', overflow: 'hidden', flexShrink: 0 },
  divider:    { width: 32, height: 1, background: 'var(--border)', margin: '2px 0' },
  unreadPip:  { position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 4, height: 16, borderRadius: 2, background: 'var(--text-primary)' },
  mentionPip: { position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', width: 4, height: 16, borderRadius: 2, background: 'var(--danger)' },
};
