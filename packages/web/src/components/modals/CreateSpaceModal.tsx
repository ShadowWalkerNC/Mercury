import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useSpaceStore } from '@/stores/spaceStore';
import type { Space } from '@mercury/shared';
import { ModalShell } from './ModalShell';

export function CreateSpaceModal({ onClose }: { onClose: () => void }) {
  const [name, setName]   = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);
  const addSpace          = useSpaceStore(s => s.addSpace);
  const navigate          = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null); setBusy(true);
    try {
      const space = await api.post<Space>('/api/v1/spaces', { name: name.trim() });
      addSpace(space);
      onClose();
      navigate(`/channels/${space.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create space');
    } finally { setBusy(false); }
  }

  return (
    <ModalShell title="Create a Space" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Your space is where you and your friends hang out. Give it a name to get started.
        </p>
        {error && <ErrorBanner msg={error} />}
        <Field label="Space name">
          <input
            style={inputStyle}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Awesome Space"
            maxLength={100}
            autoFocus
            required
          />
        </Field>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={busy || !name.trim()} style={submitBtn}>
            {busy ? 'Creating…' : 'Create Space'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </label>
  );
}

export function ErrorBanner({ msg }: { msg: string }) {
  return (
    <p style={{ background: '#3d1a1a', border: '1px solid var(--danger)', color: '#ff9a9a', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>{msg}</p>
  );
}

export const inputStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: 14,
  width: '100%',
};

export const submitBtn: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  padding: '9px 20px',
  borderRadius: 'var(--radius-sm)',
  fontWeight: 600,
  fontSize: 14,
};

export const cancelBtn: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--text-secondary)',
  padding: '9px 16px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14,
};
