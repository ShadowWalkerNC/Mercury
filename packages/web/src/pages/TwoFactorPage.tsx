import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function TwoFactorPage() {
  const [code, setCode]   = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);

  const { totpPending, loginTotp, logout } = useAuthStore();
  const navigate = useNavigate();

  // Guard: no active TOTP flow → back to login
  useEffect(() => {
    if (!totpPending) navigate('/login', { replace: true });
  }, [totpPending]);

  async function submit(raw: string) {
    const trimmed = raw.replace(/[\s\-]/g, '');
    if (busy || trimmed.length < 6) return;
    setError(null); setBusy(true);
    try {
      await loginTotp(trimmed);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code — please try again.');
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/[\s\-]/g, '');
    setCode(val);
    // Auto-advance on 6 digits (standard TOTP)
    if (val.length === 6) submit(val);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await submit(code);
  }

  async function handleCancel() {
    await logout();
    navigate('/login', { replace: true });
  }

  const s = styles;

  return (
    <div style={s.page}>
      <form onSubmit={handleSubmit} style={s.card}>
        <h1 style={s.title}>Two-factor authentication</h1>
        <p style={s.sub}>Enter the 6-digit code from your authenticator app, or a backup code.</p>

        {error && <p style={s.error}>{error}</p>}

        <label style={s.label}>Authentication code</label>
        <input
          style={s.input}
          type="text"
          inputMode="numeric"
          placeholder="000000"
          value={code}
          onChange={handleChange}
          autoFocus
          autoComplete="one-time-code"
          maxLength={8}
          disabled={busy}
          spellCheck={false}
        />

        <button
          style={{ ...s.btn, opacity: busy ? 0.6 : 1 }}
          type="submit"
          disabled={busy || code.length < 6}
        >
          {busy ? 'Verifying…' : 'Verify'}
        </button>

        <p style={s.footer}>
          Wrong account?{' '}
          <span
            role="button"
            tabIndex={0}
            onClick={handleCancel}
            onKeyDown={e => e.key === 'Enter' && handleCancel()}
            style={s.cancel}
          >
            Back to sign in
          </span>
        </p>
      </form>
    </div>
  );
}

const styles = {
  page: {
    height: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  } as React.CSSProperties,

  card: {
    background: 'var(--bg-secondary)',
    padding: 32,
    borderRadius: 'var(--radius-lg)',
    width: 420,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },

  title: { fontSize: 24, fontWeight: 700 } as React.CSSProperties,

  sub: { color: 'var(--text-secondary)', fontSize: 14 } as React.CSSProperties,

  label: {
    fontSize: 12, fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
  },

  input: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: 22,
    letterSpacing: '0.3em',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  btn: {
    background: 'var(--accent)',
    color: '#fff',
    padding: '11px 0',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    marginTop: 8,
    fontSize: 15,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  } as React.CSSProperties,

  error: {
    background: '#3d1a1a',
    border: '1px solid var(--danger)',
    color: '#ff9a9a',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
  } as React.CSSProperties,

  footer: {
    marginTop: 8,
    color: 'var(--text-secondary)',
    fontSize: 14,
    textAlign: 'center' as const,
  },

  cancel: {
    color: 'var(--accent)',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  } as React.CSSProperties,
};
