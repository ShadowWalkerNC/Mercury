/**
 * SpaceSettingsModal — opened via openModal('settings', { spaceId })
 *
 * Tabs:
 *   Overview  — rename space, upload icon (presigned S3)
 *   Danger    — delete space (requires typing the space name to confirm)
 */
import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useSpaceStore } from '@/stores/spaceStore';
import { ModalShell } from './ModalShell';
import { Field, ErrorBanner, inputStyle, submitBtn, cancelBtn } from './CreateSpaceModal';

type Tab = 'overview' | 'danger';

export function SpaceSettingsModal({ spaceId, onClose }: { spaceId: string; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const space = useSpaceStore(s => s.spaces.find(sp => sp.id === spaceId));
  if (!space) return null;

  return (
    <ModalShell title="Space Settings" onClose={onClose}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {(['overview', 'danger'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-sm)', fontSize: 14,
            fontWeight: tab === t ? 700 : 400,
            background: tab === t ? 'var(--bg-tertiary)' : 'transparent',
            color: tab === t
              ? (t === 'danger' ? 'var(--danger)' : 'var(--text-primary)')
              : (t === 'danger' ? 'var(--danger)' : 'var(--text-secondary)'),
          }}>
            {t === 'overview' ? 'Overview' : 'Danger Zone'}
          </button>
        ))}
      </div>
      {tab === 'overview' && <OverviewTab space={space} onClose={onClose} />}
      {tab === 'danger'   && <DangerTab   space={space} onClose={onClose} />}
    </ModalShell>
  );
}

function OverviewTab({ space, onClose }: { space: { id: string; name: string; icon?: string | null }; onClose: () => void }) {
  const updateSpace = useSpaceStore(s => s.updateSpace);
  const [name, setName]               = useState(space.name);
  const [iconPreview, setIconPreview] = useState<string | null>(space.icon ?? null);
  const [iconFile, setIconFile]       = useState<File | null>(null);
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [saved, setSaved]             = useState(false);
  const fileRef                       = useRef<HTMLInputElement>(null);

  function handleIconChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Space name is required'); return; }
    setError(null); setBusy(true); setSaved(false);
    try {
      let iconKey: string | undefined;
      if (iconFile) {
        const { url, key } = await api.get<{ url: string; key: string }>(
          `/api/v1/spaces/${space.id}/icon-upload-url?ext=${iconFile.name.split('.').pop()}`
        );
        await fetch(url, { method: 'PUT', body: iconFile, headers: { 'Content-Type': iconFile.type } });
        iconKey = key;
      }
      const updated = await api.patch<typeof space>(`/api/v1/spaces/${space.id}`, {
        ...(name.trim() !== space.name && { name: name.trim() }),
        ...(iconKey !== undefined      && { icon: iconKey }),
      });
      updateSpace(updated as never);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <ErrorBanner msg={error} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', background: 'var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
          onClick={() => fileRef.current?.click()} title="Click to change icon"
        >
          {iconPreview
            ? <img src={iconPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="icon" />
            : <span style={{ fontSize: 26, fontWeight: 700 }}>{space.name[0]?.toUpperCase()}</span>
          }
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" onClick={() => fileRef.current?.click()}
            style={{ ...submitBtn, fontSize: 13, padding: '6px 14px' }}>Upload Icon</button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PNG, JPG, GIF up to 8 MB</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIconChange} />
      </div>
      <Field label="Space name">
        <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}
          placeholder="My Awesome Space" maxLength={100} required />
      </Field>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
        {saved && <span style={{ fontSize: 13, color: 'var(--success)' }}>✓ Saved</span>}
        <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
        <button type="submit" disabled={busy} style={submitBtn}>{busy ? 'Saving…' : 'Save Changes'}</button>
      </div>
    </form>
  );
}

function DangerTab({ space, onClose }: { space: { id: string; name: string }; onClose: () => void }) {
  const navigate    = useNavigate();
  const removeSpace = useSpaceStore(s => s.removeSpace);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleDelete(e: FormEvent) {
    e.preventDefault();
    if (confirm !== space.name) { setError('Space name does not match'); return; }
    setError(null); setBusy(true);
    try {
      await api.delete(`/api/v1/spaces/${space.id}`);
      removeSpace(space.id);
      onClose();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete space');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleDelete} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'rgba(237,66,69,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
        <p style={{ color: 'var(--danger)', fontWeight: 700, margin: '0 0 4px' }}>Delete this space</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
          This is permanent. All channels, messages, and members will be removed immediately.
        </p>
      </div>
      {error && <ErrorBanner msg={error} />}
      <Field label={`Type "${space.name}" to confirm`}>
        <input
          style={{ ...inputStyle, borderColor: confirm && confirm !== space.name ? 'var(--danger)' : undefined }}
          value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder={space.name} autoComplete="off" required
        />
      </Field>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
        <button type="submit" disabled={busy || confirm !== space.name}
          style={{ ...submitBtn, background: 'var(--danger)', opacity: confirm !== space.name ? 0.5 : 1 }}>
          {busy ? 'Deleting…' : 'Delete Space'}
        </button>
      </div>
    </form>
  );
}
