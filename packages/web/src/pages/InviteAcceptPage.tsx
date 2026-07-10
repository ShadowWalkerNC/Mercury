/**
 * InviteAcceptPage — rendered at /invite/:code
 *
 * Flow:
 *   1. GET /api/v1/invites/:code  → { space: { id, name, icon, member_count }, uses, expires_at }
 *   2. Show space preview card
 *   3. POST /api/v1/invites/:code/accept  → joins the space
 *   4. Navigate to /channels/:spaceId
 *
 * Unauthenticated users are redirected to /login?redirect=/invite/:code
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useSpaceStore } from '@/stores/spaceStore';
import type { Space } from '@mercury/shared';

interface InvitePreview {
  code:       string;
  uses:       number;
  max_uses:   number | null;
  expires_at: string | null;
  space:      Space & { member_count: number };
}

export function InviteAcceptPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const addSpace = useSpaceStore(s => s.addSpace);

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) navigate(`/login?redirect=/invite/${code}`, { replace: true });
  }, [user]);

  useEffect(() => {
    if (!code || !user) return;
    setLoading(true);
    api.get<InvitePreview>(`/api/v1/invites/${code}`)
      .then(setPreview)
      .catch(e => setError(e instanceof Error ? e.message : 'Invalid or expired invite'))
      .finally(() => setLoading(false));
  }, [code, user]);

  async function handleAccept() {
    if (!code || !preview) return;
    setJoining(true);
    try {
      const space = await api.post<Space>(`/api/v1/invites/${code}/accept`, {});
      addSpace(space);
      navigate(`/channels/${space.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join space');
      setJoining(false);
    }
  }

  if (!user) return null;

  return (
    <div style={css.page}>
      <div style={css.card}>
        <p style={css.wordmark}>Mercury</p>

        {loading && <p style={css.muted}>Loading invite…</p>}

        {error && (
          <>
            <p style={css.errorText}>{error}</p>
            <Link to="/" style={css.linkBtn}>Go home</Link>
          </>
        )}

        {preview && !error && (
          <>
            <p style={css.subtitle}>You’ve been invited to join</p>

            <div style={css.spaceCard}>
              {preview.space.icon
                ? <img src={preview.space.icon} alt={preview.space.name} style={css.spaceIcon} />
                : <div style={css.spaceIconFallback}>
                    <span style={{ fontSize: 22, fontWeight: 700 }}>
                      {preview.space.name[0]?.toUpperCase()}
                    </span>
                  </div>
              }
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{preview.space.name}</div>
                <div style={css.muted}>
                  {preview.space.member_count} member{preview.space.member_count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {preview.expires_at && (
              <p style={css.muted}>Expires {new Date(preview.expires_at).toLocaleString()}</p>
            )}
            {preview.max_uses !== null && (
              <p style={css.muted}>{preview.uses} / {preview.max_uses} uses</p>
            )}

            <button onClick={handleAccept} disabled={joining} style={css.acceptBtn}>
              {joining ? 'Joining…' : 'Accept Invite'}
            </button>
            <Link to="/" style={css.cancelLink}>No thanks</Link>
          </>
        )}
      </div>
    </div>
  );
}

const css = {
  page:             { minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 16 },
  card:             { background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '32px 36px', width: 420, maxWidth: '100%', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', textAlign: 'center' as const },
  wordmark:         { fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--accent)', margin: 0 },
  subtitle:         { color: 'var(--text-secondary)', fontSize: 14, margin: 0 },
  spaceCard:        { display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '14px 20px', width: '100%', textAlign: 'left' as const },
  spaceIcon:        { width: 56, height: 56, borderRadius: 'var(--radius-md)', objectFit: 'cover' as const, flexShrink: 0 },
  spaceIconFallback:{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  muted:            { color: 'var(--text-muted)', fontSize: 13, margin: 0 },
  errorText:        { color: 'var(--danger)', fontSize: 14, margin: 0 },
  acceptBtn:        { background: 'var(--accent)', color: '#fff', padding: '11px 0', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 15, width: '100%', cursor: 'pointer', marginTop: 4 },
  cancelLink:       { color: 'var(--text-muted)', fontSize: 13, textDecoration: 'underline' },
  linkBtn:          { color: 'var(--accent)', fontSize: 14, textDecoration: 'underline' },
} satisfies Record<string, React.CSSProperties>;
