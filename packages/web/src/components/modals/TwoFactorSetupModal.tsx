/**
 * TwoFactorSetupModal — opened via openModal('twoFactorSetup')
 *
 * Steps:
 *   qr      → show QR + manual secret
 *   verify  → enter 6-digit code, POST enable
 *   backup  → show backup codes, copy-all
 *   disable → enter code, POST disable (shown when totp_enabled)
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { ModalShell } from './ModalShell';
import { Field, ErrorBanner, inputStyle, submitBtn, cancelBtn } from './CreateSpaceModal';

type Step = 'qr' | 'verify' | 'backup' | 'disable';

export function TwoFactorSetupModal({ onClose: propOnClose }: { onClose?: () => void }) {
  const navigate    = useNavigate();
  const onClose     = propOnClose ?? (() => navigate(-1));

  const user        = useAuthStore(s => s.user);
  const setUser     = useAuthStore(s => s.setUser);
  const totpEnabled = (user as { totp_enabled?: boolean } | null)?.totp_enabled ?? false;

  const [step, setStep]               = useState<Step>(totpEnabled ? 'disable' : 'qr');
  const [secret, setSecret]           = useState('');
  const [otpauthUrl, setOtpauthUrl]   = useState('');
  const [code, setCode]               = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError]             = useState<string | null>(null);
  const [busy, setBusy]               = useState(false);
  const [copied, setCopied]           = useState(false);
  const canvasRef                     = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (totpEnabled) return;
    api.post<{ secret: string; otpauth_url: string; backup_codes: string[] }>('/api/v1/auth/2fa/setup', {})
      .then(({ secret: s, otpauth_url: u, backup_codes: b }) => {
        setSecret(s);
        setOtpauthUrl(u);
        setBackupCodes(b);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load 2FA setup'));
  }, []);

  useEffect(() => {
    if (!otpauthUrl || !canvasRef.current) return;
    void renderQr(otpauthUrl, canvasRef.current);
  }, [otpauthUrl]);

  async function handleEnable(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setError(null); setBusy(true);
    try {
      await api.post('/api/v1/auth/2fa/verify-setup', { code });
      setUser({ ...(user!), totp_enabled: true } as typeof user);
      setStep('backup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally { setBusy(false); }
  }

  async function handleDisable(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setError(null); setBusy(true);
    try {
      await api.post('/api/v1/auth/2fa/disable', { code });
      setUser({ ...(user!), totp_enabled: false } as typeof user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally { setBusy(false); }
  }

  async function handleCopyBackup() {
    await navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === 'disable') return (
    <ModalShell title="Disable Two-Factor Auth" onClose={onClose}>
      <form onSubmit={handleDisable} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Enter the 6-digit code from your authenticator app to disable 2FA.
        </p>
        {error && <ErrorBanner msg={error} />}
        <Field label="Authentication code">
          <input style={{ ...inputStyle, letterSpacing: '0.2em', fontSize: 20, textAlign: 'center' }}
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000" maxLength={6} autoFocus inputMode="numeric" required />
        </Field>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={busy || code.length !== 6}
            style={{ ...submitBtn, background: 'var(--danger)' }}>
            {busy ? 'Disabling…' : 'Disable 2FA'}
          </button>
        </div>
      </form>
    </ModalShell>
  );

  if (step === 'backup') return (
    <ModalShell title="Save Your Backup Codes" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Store these somewhere safe. Each code can be used once if you lose your authenticator.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {backupCodes.map(c => (
            <code key={c} style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 13, fontFamily: 'monospace', textAlign: 'center' }}>{c}</code>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={handleCopyBackup}
            style={{ ...submitBtn, background: copied ? 'var(--success)' : 'var(--bg-tertiary)', color: copied ? '#fff' : 'var(--text-primary)', fontSize: 13, padding: '8px 16px' }}>
            {copied ? 'Copied!' : 'Copy All'}
          </button>
          <button onClick={onClose} style={submitBtn}>Done</button>
        </div>
      </div>
    </ModalShell>
  );

  return (
    <ModalShell title="Set Up Two-Factor Auth" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {step === 'qr' && (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Scan this QR code with your authenticator app, then click Next.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#fff', padding: 12, borderRadius: 'var(--radius-md)', display: 'inline-block' }}>
                <canvas ref={canvasRef} width={200} height={200} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Can't scan? Enter this manually:<br />
                <code style={{ letterSpacing: '0.12em', fontSize: 13 }}>{secret}</code>
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
              <button type="button" onClick={() => setStep('verify')} style={submitBtn} disabled={!secret}>Next</button>
            </div>
          </>
        )}
        {step === 'verify' && (
          <form onSubmit={handleEnable} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Enter the 6-digit code from your authenticator to confirm setup.
            </p>
            {error && <ErrorBanner msg={error} />}
            <Field label="Authentication code">
              <input style={{ ...inputStyle, letterSpacing: '0.2em', fontSize: 20, textAlign: 'center' }}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" maxLength={6} autoFocus inputMode="numeric" required />
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setStep('qr'); setCode(''); setError(null); }} style={cancelBtn}>Back</button>
              <button type="submit" disabled={busy || code.length !== 6} style={submitBtn}>
                {busy ? 'Verifying…' : 'Enable 2FA'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalShell>
  );
}

async function renderQr(data: string, canvas: HTMLCanvasElement) {
  try {
    const QRCode = await import('qrcode');
    await QRCode.toCanvas(canvas, data, { width: 200, margin: 1, color: { dark: '#000', light: '#fff' } });
  } catch {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#000'; ctx.font = '11px monospace';
      ctx.fillText('QR unavailable — use manual code above', 10, 100);
    }
  }
}
