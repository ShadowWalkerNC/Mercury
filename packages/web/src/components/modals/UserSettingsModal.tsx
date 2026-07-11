/**
 * UserSettingsModal — profile edit + notifications + 2FA entry point.
 * Opened via: ModalHost (openModal 'userSettings') or /settings/profile route.
 */
import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { ModalShell } from './ModalShell';
import { Field, ErrorBanner, inputStyle, submitBtn, cancelBtn } from './CreateSpaceModal';
import { isSupported, currentPermission, subscribe, unsubscribe } from '@/lib/notifications';

export function UserSettingsModal({ onClose }: { onClose?: () => void }) {
  const navigate  = useNavigate();
  const close     = onClose ?? (() => navigate(-1));

  const user      = useAuthStore(s => s.user);
  const setUser   = useAuthStore(s => s.setUser);
  const openModal = useUIStore(s => s.openModal);

  const [displayName,   setDisplayName]   = useState(user?.display_name ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar ?? null);
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [saved,     setSaved]     = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [notifBusy, setNotifBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNotifPerm(currentPermission()); }, []);

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
          `/api/v1/users/me/avatar-upload-url?ext=${avatarFile.name.split('.').pop()}`
        );
        await fetch(url, { method: 'PUT', body: avatarFile, headers: { 'Content-Type': avatarFile.type } });
        avatarKey = key;
      }
      const updated = await api.patch<typeof user>('/api/v1/users/me', {
        ...(displayName.trim() !== (user?.display_name ?? '') && { display_name: displayName.trim() || null }),
        ...(avatarKey !== undefined && { avatar: avatarKey }),
      });
      setUser(updated as never);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setBusy(false); }
  }

  async function toggleNotifications() {
    setNotifBusy(true);
    try {
      if (notifPerm === 'granted') {
        await unsubscribe();
        setNotifPerm('default');
      } else {
        const ok = await subscribe();
        setNotifPerm(ok ? 'granted' : currentPermission());
      }
    } catch (e) { console.error('Notif toggle failed', e); }
    finally { setNotifBusy(false); }
  }

  const name    = user?.display_name ?? user?.username ?? '?';
  const initial = name[0]?.toUpperCase() ?? '?';
  const notifSupported = isSupported();

  return (
    <ModalShell title="User Settings" onClose={close}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && <ErrorBanner msg={error} />}

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => fileRef.current?.click()}
          >
            {avatarPreview
              ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
              : <span style={{ fontSize: 26, fontWeight: 700 }}>{initial}</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{ ...submitBtn, fontSize: 13, padding: '6px 14px' }}>Change Avatar</button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PNG, JPG up to 8 MB</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        {/* Profile fields */}
        <Field label="Display name">
          <input style={inputStyle} value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder={user?.username} maxLength={80} />
        </Field>

        <Field label="Username">
          <input style={{ ...inputStyle, opacity: 0.6 }} value={user?.username ?? ''} disabled />
        </Field>

        {/* Notifications */}
        {notifSupported && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Push notifications</div>
              {notifPerm === 'denied' && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Blocked in browser settings</div>
              )}
            </div>
            <button
              type="button"
              disabled={notifBusy || notifPerm === 'denied'}
              onClick={toggleNotifications}
              style={{
                ...submitBtn,
                fontSize: 12,
                padding: '5px 12px',
                background: notifPerm === 'granted' ? 'var(--bg-tertiary)' : 'var(--accent)',
                color: notifPerm === 'granted' ? 'var(--text-secondary)' : '#fff',
                border: notifPerm === 'granted' ? '1px solid var(--border)' : 'none',
                opacity: notifBusy || notifPerm === 'denied' ? 0.5 : 1,
              }}
            >
              {notifBusy ? '…' : notifPerm === 'granted' ? 'Disable' : 'Enable'}
            </button>
          </div>
        )}

        {/* 2FA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Two-factor authentication</span>
          <button type="button"
            style={{ ...submitBtn, fontSize: 12, padding: '5px 12px' }}
            onClick={() => { close(); openModal('twoFactorSetup'); }}>
            {user?.totp_enabled ? 'Manage 2FA' : 'Enable 2FA'}
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          {saved && <span style={{ fontSize: 13, color: 'var(--success)' }}>✓ Saved</span>}
          <button type="button" onClick={close} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={busy} style={submitBtn}>{busy ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
