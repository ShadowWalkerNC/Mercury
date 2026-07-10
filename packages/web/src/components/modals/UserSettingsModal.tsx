/**
 * UserSettingsModal — opened via openModal('userSettings')
 *
 * Tabs:
 *   My Account  — avatar upload, display name, status
 *   Security    — change password, 2FA setup link
 *
 * Avatar upload flow:
 *   1. User picks a file
 *   2. GET /api/v1/users/@me/avatar-upload-url  → { url, key }
 *   3. PUT url (S3 presigned) with raw file bytes
 *   4. PATCH /api/v1/users/@me  { avatar: key }
 */
import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { ModalShell } from './ModalShell';
import { Field, ErrorBanner, inputStyle, submitBtn, cancelBtn } from './CreateSpaceModal';

type Tab = 'account' | 'security';

export function UserSettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('account');

  return (
    <ModalShell title="User Settings" onClose={onClose}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {(['account', 'security'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: tab === t ? 700 : 400,
              fontSize: 14,
              background: tab === t ? 'var(--bg-tertiary)' : 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {t === 'account' ? 'My Account' : 'Security'}
          </button>
        ))}
      </div>

      {tab === 'account' && <AccountTab onClose={onClose} />}
      {tab === 'security' && <SecurityTab onClose={onClose} />}
    </ModalShell>
  );
}

// ─── Account tab ───

function AccountTab({ onClose }: { onClose: () => void }) {
  const user       = useAuthStore(s => s.user);
  const setUser    = useAuthStore(s => s.setUser);

  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [status, setStatus]           = useState(user?.status ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar ?? null);
  const [avatarFile, setAvatarFile]   = useState<File | null>(null);
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [saved, setSaved]             = useState(false);
  const fileRef                       = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true); setSaved(false);
    try {
      let avatarKey: string | undefined;

      if (avatarFile) {
        const { url, key } = await api.get<{ url: string; key: string }>(
          `/api/v1/users/@me/avatar-upload-url?ext=${avatarFile.name.split('.').pop()}`
        );
        await fetch(url, { method: 'PUT', body: avatarFile, headers: { 'Content-Type': avatarFile.type } });
        avatarKey = key;
      }

      const updated = await api.patch<typeof user>('/api/v1/users/@me', {
        ...(displayName !== (user?.display_name ?? '') && { display_name: displayName }),
        ...(status      !== (user?.status ?? '')       && { status }),
        ...(avatarKey !== undefined                    && { avatar: avatarKey }),
      });

      setUser(updated!);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <ErrorBanner msg={error} />}

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
          onClick={() => fileRef.current?.click()}
          title="Click to change avatar"
        >
          {avatarPreview
            ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
            : <span style={{ fontSize: 26, fontWeight: 700 }}>{user?.username?.[0]?.toUpperCase()}</span>
          }
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button type="button" onClick={() => fileRef.current?.click()}
            style={{ ...submitBtn, fontSize: 13, padding: '6px 14px' }}>
            Upload Avatar
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>JPG, PNG, GIF up to 8 MB</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
      </div>

      <Field label="Username">
        <input style={{ ...inputStyle, opacity: 0.5 }} value={user?.username ?? ''} readOnly />
      </Field>

      <Field label="Display name">
        <input style={inputStyle} value={displayName} onChange={e => setDisplayName(e.target.value)}
          placeholder="How should we display your name?" maxLength={64} />
      </Field>

      <Field label="Status">
        <input style={inputStyle} value={status} onChange={e => setStatus(e.target.value)}
          placeholder="What are you up to?" maxLength={128} />
      </Field>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
        {saved && <span style={{ fontSize: 13, color: 'var(--success)' }}>✓ Saved</span>}
        <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
        <button type="submit" disabled={busy} style={submitBtn}>{busy ? 'Saving…' : 'Save Changes'}</button>
      </div>
    </form>
  );
}

// ─── Security tab ───

function SecurityTab({ onClose }: { onClose: () => void }) {
  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);
  const openModal               = useAuthStore(s => s.openTotpFlow); // noop placeholder

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError('Passwords do not match'); return; }
    if (next.length < 8)  { setError('Password must be at least 8 characters'); return; }
    setError(null); setBusy(true);
    try {
      await api.post('/api/v1/users/@me/change-password', { current_password: current, new_password: next });
      setSaved(true);
      setCurrent(''); setNext(''); setConfirm('');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && <ErrorBanner msg={error} />}

      <Field label="Current password">
        <input type="password" style={inputStyle} value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" required />
      </Field>
      <Field label="New password">
        <input type="password" style={inputStyle} value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" required />
      </Field>
      <Field label="Confirm new password">
        <input type="password" style={inputStyle} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
      </Field>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
        {saved && <span style={{ fontSize: 13, color: 'var(--success)' }}>✓ Password changed</span>}
        <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
        <button type="submit" disabled={busy || !current || !next || !confirm} style={submitBtn}>
          {busy ? 'Saving…' : 'Change Password'}
        </button>
      </div>
    </form>
  );
}
