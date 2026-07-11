/**
 * MemberList — right-hand sidebar showing space members.
 *
 * - Fetches GET /api/v1/spaces/:id/members on mount
 * - Listens to WS MEMBER_ADD / MEMBER_REMOVE / PRESENCE_UPDATE for live updates
 * - Groups members into Online / Offline
 * - Shows role badge (owner ★, admin ◆)
 * - Right-click context menu: copy user ID, kick (owner/admin only)
 */
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { gateway } from '@/lib/gateway';
import { WSOp } from '@mercury/shared';
import { useAuthStore } from '@/stores/authStore';

interface Member {
  id:           string;
  username:     string;
  display_name: string | null;
  avatar:       string | null;
  role:         'owner' | 'admin' | 'member';
  online:       boolean;
}

interface Props { spaceId: string; }

export function MemberList({ spaceId }: Props) {
  const me                    = useAuthStore(s => s.user);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx]         = useState<{ member: Member; x: number; y: number } | null>(null);
  const containerRef          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    api.get<Member[]>(`/api/v1/spaces/${spaceId}/members`)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [spaceId]);

  useEffect(() => {
    const offs = [
      gateway.on(WSOp.MEMBER_JOIN, (p) => {
        const m = p.d as Member & { space_id: string };
        if (m.space_id !== spaceId) return;
        setMembers(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
      }),
      gateway.on(WSOp.MEMBER_LEAVE, (p) => {
        const { user_id, space_id } = p.d as { user_id: string; space_id: string };
        if (space_id !== spaceId) return;
        setMembers(prev => prev.filter(x => x.id !== user_id));
      }),
      gateway.on(WSOp.PRESENCE_UPDATE, (p) => {
        const { user_id, online } = p.d as { user_id: string; online: boolean };
        setMembers(prev => prev.map(x => x.id === user_id ? { ...x, online } : x));
      }),
    ];
    return () => offs.forEach(off => off());
  }, [spaceId]);

  useEffect(() => {
    if (!ctx) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setCtx(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ctx]);

  const myRole    = members.find(m => m.id === me?.id)?.role ?? 'member';
  const canManage = myRole === 'owner' || myRole === 'admin';
  const online    = members.filter(m => m.online);
  const offline   = members.filter(m => !m.online);

  async function handleKick(memberId: string) {
    setCtx(null);
    try {
      await api.delete(`/api/v1/spaces/${spaceId}/members/${memberId}`);
      setMembers(prev => prev.filter(x => x.id !== memberId));
    } catch (e) { console.error('Kick failed', e); }
  }

  return (
    <aside style={css.sidebar} ref={containerRef}>
      <div style={css.header}>Members — {members.length}</div>
      {loading && <p style={css.muted}>Loading…</p>}
      {!loading && (
        <div style={css.scroll}>
          {online.length > 0 && (
            <Group label={`Online — ${online.length}`}>
              {online.map(m => (
                <MemberRow key={m.id} member={m} isSelf={m.id === me?.id}
                  onContext={(e) => { e.preventDefault(); setCtx({ member: m, x: e.clientX, y: e.clientY }); }} />
              ))}
            </Group>
          )}
          {offline.length > 0 && (
            <Group label={`Offline — ${offline.length}`}>
              {offline.map(m => (
                <MemberRow key={m.id} member={m} isSelf={m.id === me?.id}
                  onContext={(e) => { e.preventDefault(); setCtx({ member: m, x: e.clientX, y: e.clientY }); }} />
              ))}
            </Group>
          )}
          {members.length === 0 && <p style={css.muted}>No members found.</p>}
        </div>
      )}
      {ctx && (
        <div style={{ ...css.ctxMenu, top: ctx.y, left: ctx.x }} onClick={() => setCtx(null)}>
          <button style={css.ctxItem} onClick={() => navigator.clipboard.writeText(ctx.member.id)}>
            Copy User ID
          </button>
          {canManage && ctx.member.id !== me?.id && ctx.member.role !== 'owner' && (
            <button style={{ ...css.ctxItem, color: 'var(--danger)' }} onClick={() => handleKick(ctx.member.id)}>
              Kick
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 8px', marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function MemberRow({ member, isSelf, onContext }: {
  member: Member; isSelf: boolean;
  onContext: (e: React.MouseEvent) => void;
}) {
  const name    = member.display_name ?? member.username;
  const initial = name[0]?.toUpperCase() ?? '?';
  return (
    <div style={{ ...css.row, opacity: member.online ? 1 : 0.45 }} onContextMenu={onContext} title={isSelf ? `${name} (you)` : name}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {member.avatar
            ? <img src={member.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={name} />
            : <span style={{ fontSize: 14, fontWeight: 700 }}>{initial}</span>}
        </div>
        <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: member.online ? 'var(--success)' : 'var(--text-muted)', border: '2px solid var(--bg-secondary)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: isSelf ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {name}{isSelf ? ' — you' : ''}
        </span>
      </div>
      {member.role === 'owner' && <span title="Owner" style={css.badge}>&#9733;</span>}
      {member.role === 'admin' && <span title="Admin" style={{ ...css.badge, color: 'var(--text-secondary)' }}>&#9670;</span>}
    </div>
  );
}

const css = {
  sidebar: { width: 240, minWidth: 240, background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' as const, borderLeft: '1px solid var(--border)', position: 'relative' as const, userSelect: 'none' as const },
  header:  { height: 48, display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  scroll:  { flex: 1, overflowY: 'auto' as const, padding: '12px 4px' },
  muted:   { color: 'var(--text-muted)', fontSize: 13, padding: '8px 12px' },
  row:     { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 'var(--radius-sm)', cursor: 'default', transition: 'background 0.1s' },
  badge:   { fontSize: 13, color: 'var(--accent)', flexShrink: 0 },
  ctxMenu: { position: 'fixed' as const, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 2000, minWidth: 160, padding: 4 },
  ctxItem: { display: 'block', width: '100%', textAlign: 'left' as const, padding: '8px 12px', fontSize: 13, borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
} satisfies Record<string, React.CSSProperties>;
