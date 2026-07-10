/**
 * DMList — left sidebar for /channels/@me
 */
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '@/lib/api';
import { gateway } from '@/lib/gateway';
import { WSOp } from '@mercury/shared';
import { useAuthStore } from '@/stores/authStore';

export interface DMConversation {
  id:           string;
  recipient:    { id: string; username: string; display_name: string | null; avatar: string | null };
  last_message: string | null;
  unread:       number;
}

export function DMList() {
  const me                        = useAuthStore(s => s.user);
  const [dms,       setDms]       = useState<DMConversation[]>([]);
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<{ id: string; username: string; display_name: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch,setShowSearch]= useState(false);

  useEffect(() => {
    api.get<DMConversation[]>('/api/v1/dms').then(setDms).catch(console.error);
  }, []);

  useEffect(() => {
    const off = gateway.on(WSOp.DM_CREATE, (p) => {
      const dm = p.d as DMConversation;
      setDms(prev => prev.some(d => d.id === dm.id) ? prev : [dm, ...prev]);
    });
    return off;
  }, []);

  useEffect(() => {
    const off = gateway.on(WSOp.MESSAGE_CREATE, (p) => {
      const msg = p.d as { channel_id: string; content: string; author_id: string };
      setDms(prev => prev.map(d =>
        d.id !== msg.channel_id ? d : {
          ...d,
          last_message: msg.content,
          unread: msg.author_id === me?.id ? d.unread : d.unread + 1,
        }
      ));
    });
    return off;
  }, [me?.id]);

  async function searchUsers(q: string) {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get<typeof results>(`/api/v1/users/search?q=${encodeURIComponent(q)}`);
      setResults(res.filter(u => u.id !== me?.id));
    } catch { setResults([]); }
    finally { setSearching(false); }
  }

  async function openDM(userId: string) {
    setShowSearch(false); setQuery(''); setResults([]);
    try {
      const dm = await api.post<DMConversation>('/api/v1/dms', { recipient_id: userId });
      setDms(prev => prev.some(d => d.id === dm.id) ? prev : [dm, ...prev]);
    } catch (e) { console.error('Open DM failed', e); }
  }

  return (
    <aside style={css.sidebar}>
      <div style={css.header}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Direct Messages</span>
        <button style={css.newBtn} title="New DM" onClick={() => setShowSearch(s => !s)}>+</button>
      </div>

      {showSearch && (
        <div style={css.searchBox}>
          <input autoFocus style={css.searchInput} placeholder="Search users…"
            value={query} onChange={e => searchUsers(e.target.value)} />
          {searching && <p style={css.hint}>Searching…</p>}
          {results.map(u => (
            <button key={u.id} style={css.resultRow} onClick={() => openDM(u.id)}>
              <span style={css.resultInitial}>{(u.display_name ?? u.username)[0]?.toUpperCase()}</span>
              <span style={{ fontSize: 13 }}>{u.display_name ?? u.username}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>@{u.username}</span>
            </button>
          ))}
          {!searching && query && results.length === 0 && <p style={css.hint}>No users found.</p>}
        </div>
      )}

      <div style={css.list}>
        {dms.length === 0 && <p style={css.empty}>No direct messages yet.</p>}
        {dms.map(dm => {
          const name = dm.recipient.display_name ?? dm.recipient.username;
          const init = name[0]?.toUpperCase() ?? '?';
          return (
            <NavLink
              key={dm.id}
              to={`/channels/@me/${dm.id}`}
              onClick={() => setDms(prev => prev.map(d => d.id === dm.id ? { ...d, unread: 0 } : d))}
              style={({ isActive }) => ({
                ...css.dmRow,
                background: isActive ? 'var(--bg-active)' : 'transparent',
                textDecoration: 'none',
                color: 'var(--text-primary)',
              })}
            >
              <div style={css.avatar}>
                {dm.recipient.avatar
                  ? <img src={dm.recipient.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={name} />
                  : <span style={{ fontSize: 14, fontWeight: 700 }}>{init}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: dm.unread > 0 ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                {dm.last_message && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dm.last_message}</div>
                )}
              </div>
              {dm.unread > 0 && (
                <span style={css.badge}>{dm.unread > 9 ? '9+' : dm.unread}</span>
              )}
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
}

const css: Record<string, React.CSSProperties> = {
  sidebar:      { width: 240, minWidth: 240, background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' },
  header:       { height: 48, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: '1px solid var(--border)', gap: 8, flexShrink: 0 },
  newBtn:       { marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary)', lineHeight: 1, padding: 4 },
  searchBox:    { padding: '8px 8px 4px', borderBottom: '1px solid var(--border)' },
  searchInput:  { width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, padding: '6px 10px' },
  hint:         { fontSize: 12, color: 'var(--text-muted)', padding: '6px 4px' },
  resultRow:    { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 4px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' },
  resultInitial:{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  list:         { flex: 1, overflowY: 'auto', padding: '8px 6px' },
  empty:        { fontSize: 13, color: 'var(--text-muted)', padding: '12px 8px' },
  dmRow:        { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  avatar:       { width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badge:        { minWidth: 18, height: 18, borderRadius: 9, background: 'var(--danger)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 },
};
