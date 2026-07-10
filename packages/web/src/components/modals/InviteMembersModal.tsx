import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ModalShell } from './ModalShell';
import { ErrorBanner } from './CreateSpaceModal';

interface Invite { code: string; uses: number; max_uses: number | null; expires_at: string | null; }

export function InviteMembersModal({ onClose, spaceId }: { onClose: () => void; spaceId: string }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy]     = useState(false);

  useEffect(() => { void createInvite(); }, []);

  async function createInvite() {
    setBusy(true); setError(null);
    try {
      const inv = await api.post<Invite>(`/api/v1/spaces/${spaceId}/invites`, {});
      setInvite(inv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally { setBusy(false); }
  }

  const inviteUrl = invite ? `${location.origin}/invite/${invite.code}` : '';

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ModalShell title="Invite People" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Share this link to invite people to your space. Links expire after 24 hours.
        </p>
        {error && <ErrorBanner msg={error} />}
        {busy && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Generating invite…</p>}
        {invite && (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                readOnly
                value={inviteUrl}
                style={{
                  flex: 1,
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  outline: 'none',
                }}
                onFocus={e => e.target.select()}
              />
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? 'var(--success)' : 'var(--accent)',
                  color: '#fff',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s',
                }}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Your invite link expires in 24 hours.
            </p>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', padding: '8px 16px', fontSize: 14 }}>Done</button>
        </div>
      </div>
    </ModalShell>
  );
}
