import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);
  const { register } = useAuthStore();
  const navigate     = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setError(null); setBusy(true);
    try { await register(username, email, password); navigate('/'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Registration failed'); }
    finally { setBusy(false); }
  }

  const s = styles;
  return (
    <div style={s.page}>
      <form onSubmit={handleSubmit} style={s.card}>
        <h1 style={s.title}>Create account</h1>
        <p style={s.sub}>Join Mercury</p>
        {error && <p style={s.error}>{error}</p>}
        <label style={s.label}>Username</label>
        <input style={s.input} value={username} onChange={e => setUsername(e.target.value)} required minLength={2} maxLength={32} />
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label style={s.label}>Password</label>
        <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        <label style={s.label}>Confirm password</label>
        <input style={s.input} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        <button style={s.btn} type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button>
        <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
          Have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
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
