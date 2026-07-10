import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useSpaceStore } from '@/stores/spaceStore';
import type { Channel } from '@mercury/shared';
import { ModalShell } from './ModalShell';
import { Field, ErrorBanner, inputStyle, submitBtn, cancelBtn } from './CreateSpaceModal';

interface Props { onClose: () => void; spaceId: string; defaultType: 'text' | 'voice'; }

export function CreateChannelModal({ onClose, spaceId, defaultType }: Props) {
  const [name, setName]   = useState('');
  const [type, setType]   = useState<'text' | 'voice'>(defaultType);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);
  const addChannel        = useSpaceStore(s => s.addChannel);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null); setBusy(true);
    try {
      const channel = await api.post<Channel>(`/api/v1/spaces/${spaceId}/channels`, {
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        type,
      });
      addChannel(channel);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel');
    } finally { setBusy(false); }
  }

  return (
    <ModalShell title="Create Channel" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <ErrorBanner msg={error} />}

        <Field label="Channel type">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['text', 'voice'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 'var(--radius-sm)',
                  background: type === t ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: type === t ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: 14, border: '1px solid var(--border)',
                }}
              >
                {t === 'text' ? '# Text' : '🔊 Voice'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Channel name">
          <input
            style={inputStyle}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={type === 'text' ? 'general' : 'voice-chat'}
            maxLength={100}
            autoFocus
            required
          />
        </Field>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={busy || !name.trim()} style={submitBtn}>
            {busy ? 'Creating…' : 'Create Channel'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
