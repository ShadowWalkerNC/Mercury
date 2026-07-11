import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface AdminStats {
  users: number;
  messages: number;
  spaces: number;
  channels: number;
  ws_connections: number;
  db_size_bytes: number;
  uptime_seconds: number;
  node_version: string;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  status: string;
  is_admin: number;
  is_banned: number;
  created_at: string;
}

export function AdminShell() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        setLoading(true);
        const [statsData, usersData] = await Promise.all([
          api.get<AdminStats>('/api/v1/admin/stats'),
          api.get<AdminUser[]>('/api/v1/admin/users'),
        ]);
        setStats(statsData);
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch admin data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleUserAction(userId: string, action: string) {
    if (actionBusy) return;
    setActionBusy(userId + '-' + action);
    try {
      await api.patch(`/api/v1/admin/users/${userId}`, { action });
      // Refresh user list
      const usersData = await api.get<AdminUser[]>('/api/v1/admin/users');
      setUsers(usersData);
      // Refresh stats
      const statsData = await api.get<AdminStats>('/api/v1/admin/stats');
      setStats(statsData);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionBusy(null);
    }
  }

  if (loading) {
    return (
      <div style={css.loadingContainer}>
        <div style={css.spinner} />
        <span style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>loading dashboard…</span>
      </div>
    );
  }

  return (
    <div style={css.container}>
      {/* Header */}
      <header style={css.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/app')} style={css.backBtn}>
            ← Back to App
          </button>
          <h1 style={css.title}>Admin Panel</h1>
        </div>
        <span style={css.adminBadge}>Operator Mode</span>
      </header>

      {error && <div style={css.errorBanner}>{error}</div>}

      {/* Tabs */}
      <div style={css.tabs}>
        <button
          onClick={() => setActiveTab('stats')}
          style={{ ...css.tab, ...(activeTab === 'stats' ? css.activeTab : {}) }}
        >
          System Stats
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{ ...css.tab, ...(activeTab === 'users' ? css.activeTab : {}) }}
        >
          User Manager ({users.length})
        </button>
      </div>

      <main style={css.main}>
        {activeTab === 'stats' && stats && (
          <div style={css.grid}>
            {/* Stats Cards */}
            <div style={css.card}>
              <div style={css.cardLabel}>Active Gateway Connections</div>
              <div style={css.cardValue}>{stats.ws_connections}</div>
              <div style={css.cardSub}>live WebSocket sessions</div>
            </div>
            <div style={css.card}>
              <div style={css.cardLabel}>Total Registered Users</div>
              <div style={css.cardValue}>{stats.users}</div>
              <div style={css.cardSub}>accounts in database</div>
            </div>
            <div style={css.card}>
              <div style={css.cardLabel}>Spaces & Channels</div>
              <div style={css.cardValue}>{stats.spaces} / {stats.channels}</div>
              <div style={css.cardSub}>active workspace directories</div>
            </div>
            <div style={css.card}>
              <div style={css.cardLabel}>Database size</div>
              <div style={css.cardValue}>{(stats.db_size_bytes / 1024 / 1024).toFixed(2)} MB</div>
              <div style={css.cardSub}>SQLite file volume</div>
            </div>
            <div style={css.card}>
              <div style={css.cardLabel}>Server Uptime</div>
              <div style={css.cardValue}>
                {Math.floor(stats.uptime_seconds / 3600)}h {Math.floor((stats.uptime_seconds % 3600) / 60)}m
              </div>
              <div style={css.cardSub}>process uptime sequence</div>
            </div>
            <div style={css.card}>
              <div style={css.cardLabel}>Environment</div>
              <div style={{ ...css.cardValue, fontSize: 20, marginTop: 8 }}>{stats.node_version}</div>
              <div style={css.cardSub}>Node.js engine version</div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={css.tableWrapper}>
            <table style={css.table}>
              <thead>
                <tr>
                  <th style={css.th}>User</th>
                  <th style={css.th}>Email</th>
                  <th style={css.th}>Status</th>
                  <th style={css.th}>Roles / Flags</th>
                  <th style={css.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const initial = u.username[0]?.toUpperCase() ?? '?';
                  return (
                    <tr key={u.id} style={css.tr}>
                      <td style={css.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={css.avatar}>
                            {u.avatar ? (
                              <img src={u.avatar} style={css.avatarImg} alt="avatar" />
                            ) : (
                              <span>{initial}</span>
                            )}
                          </div>
                          <span style={{ fontWeight: 600 }}>{u.username}</span>
                        </div>
                      </td>
                      <td style={css.td}>{u.email}</td>
                      <td style={css.td}>
                        <span style={{
                          fontSize: 12,
                          color: u.status === 'online' ? 'var(--success)' : 'var(--text-muted)'
                        }}>
                          ● {u.status}
                        </span>
                      </td>
                      <td style={css.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {u.is_admin === 1 && <span style={css.tagAdmin}>Admin</span>}
                          {u.is_banned === 1 && <span style={css.tagBanned}>Banned</span>}
                          {u.is_admin === 0 && u.is_banned === 0 && <span style={css.tagMember}>Member</span>}
                        </div>
                      </td>
                      <td style={css.td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {u.id !== currentUser?.id && (
                            <>
                              {u.is_banned === 0 ? (
                                <button
                                  onClick={() => handleUserAction(u.id, 'ban')}
                                  style={{ ...css.btn, ...css.btnDanger }}
                                  disabled={!!actionBusy}
                                >
                                  Ban
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUserAction(u.id, 'unban')}
                                  style={{ ...css.btn, ...css.btnSuccess }}
                                  disabled={!!actionBusy}
                                >
                                  Unban
                                </button>
                              )}
                              {u.is_admin === 0 ? (
                                <button
                                  onClick={() => handleUserAction(u.id, 'make_admin')}
                                  style={css.btn}
                                  disabled={!!actionBusy}
                                >
                                  Promote
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUserAction(u.id, 'remove_admin')}
                                  style={css.btn}
                                  disabled={!!actionBusy}
                                >
                                  Demote
                                </button>
                              )}
                              <button
                                onClick={() => handleUserAction(u.id, 'force_logout')}
                                style={css.btn}
                                disabled={!!actionBusy}
                              >
                                Log Out
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleUserAction(u.id, 'revoke_2fa')}
                            style={css.btn}
                            disabled={!!actionBusy}
                          >
                            Reset 2FA
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

const css: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100vw',
    height: '100dvh',
    background: 'var(--canvas)',
  },
  spinner: {
    width: 24,
    height: 24,
    border: '2px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  container: {
    width: '100vw',
    height: '100dvh',
    background: 'var(--canvas)',
    color: 'var(--text-primary)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    padding: '24px 40px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  backBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
  },
  adminBadge: {
    background: 'rgba(255, 69, 58, 0.1)',
    color: '#ff453a',
    border: '1px solid rgba(255, 69, 58, 0.2)',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  errorBanner: {
    background: 'rgba(255, 69, 58, 0.1)',
    border: '1px solid rgba(255, 69, 58, 0.2)',
    color: '#ff453a',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    marginBottom: 16,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    borderBottom: '1px solid var(--border)',
    marginBottom: 24,
  },
  tab: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    position: 'relative',
    bottom: -1,
  },
  activeTab: {
    color: 'var(--text-primary)',
    borderBottom: '2px solid var(--accent)',
  },
  main: {
    flexGrow: 1,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'var(--bg-secondary, #1e1e1e)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  },
  cardSub: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  tableWrapper: {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: 14,
  },
  th: {
    background: 'var(--bg-secondary)',
    padding: '12px 16px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  tr: {
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '12px 16px',
    verticalAlign: 'middle',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  tagAdmin: {
    background: 'rgba(255, 159, 10, 0.1)',
    color: '#ff9f0a',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  tagBanned: {
    background: 'rgba(255, 69, 58, 0.1)',
    color: '#ff453a',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  tagMember: {
    background: 'rgba(48, 209, 88, 0.1)',
    color: '#30d158',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  btn: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    cursor: 'pointer',
  },
  btnDanger: {
    background: 'rgba(255, 69, 58, 0.1)',
    color: '#ff453a',
    border: '1px solid rgba(255, 69, 58, 0.2)',
  },
  btnSuccess: {
    background: 'rgba(48, 209, 88, 0.1)',
    color: '#30d158',
    border: '1px solid rgba(48, 209, 88, 0.2)',
  },
};
