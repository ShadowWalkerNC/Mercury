import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@mercury/shared';

export function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]         = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);
  const { login, totpRequired, totpSession, setTokens } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogin(e: FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      await login(email, password);
      if (!useAuthStore.getState().totpRequired) navigate('/');
    } catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); }
    finally { setBusy(false); }
  }

  async function handleTotp(e: FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const res = await fetch('/api/v1/auth/2fa/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totp_session: totpSession, code }),
      });
      const data = await res.json() as { user?: User; access_token?: string; refresh_token?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Invalid code');
      setTokens(data.access_token!, data.refresh_token!, data.user!);
      navigate('/');
    } catch (err) { setError(err instanceof Error ? err.message : '2FA failed'); }
    finally { setBusy(false); }
  }

  const s = styles;
  if (totpRequired) return (
    <div style={s.page}>
      <form onSubmit={handleTotp} style={s.card}>
        <h1 style={s.title}>Two-factor authentication</h1>
        <p style={s.sub}>Enter the code from your authenticator app.</p>
        {error && <p style={s.error}>{error}</p>}
        <input style={s.input} type="text" placeholder="6-digit code" value={code}
          onChange={e => setCode(e.target.value)} autoFocus maxLength={8} />
        <button style={s.btn} type="submit" disabled={busy}>Verify</button>
      </form>
    </div>
  );

  return (
    <div style={s.page}>
      <form onSubmit={handleLogin} style={s.card}>
        <h1 style={s.title}>Welcome back</h1>
        <p style={s.sub}>Sign in to Mercury</p>
        {error && <p style={s.error}>{error}</p>}
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label style={s.label}>Password</label>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button style={s.btn} type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
          No account? <Link to="/register" style={{ color: 'var(--accent)' }}>Register</Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  page:  { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
  card:  { background: 'var(--bg-secondary)', padding: 32, borderRadius: 'var(--radius-lg)', width: 420, display: 'flex', flexDirection: 'column' as const, gap: 12 },
  title: { fontSize: 24, fontWeight: 700 } as React.CSSProperties,
  sub:   { color: 'var(--text-secondary)', fontSize: 14 } as React.CSSProperties,
  label: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, color: 'var(--text-secondary)', letterSpacing: '0.05em' },
  input: { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', color: 'var(--text-primary)', outline: 'none', fontSize: 14 } as React.CSSProperties,
  btn:   { background: 'var(--accent)', color: '#fff', padding: '11px 0', borderRadius: 'var(--radius-sm)', fontWeight: 600, marginTop: 8, fontSize: 15 } as React.CSSProperties,
  error: { background: '#3d1a1a', border: '1px solid var(--danger)', color: '#ff9a9a', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 } as React.CSSProperties,
};
