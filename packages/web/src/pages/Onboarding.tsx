import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { Pill } from '../components/ui/Pill';
import { AuroraCanvas } from '../components/layout/AuroraCanvas';
import { useThemeStore } from '../stores/themeStore';
import { api } from '../lib/api';

type Step = 'space' | 'name' | 'aurora';

const STEPS: Step[] = ['space', 'name', 'aurora'];

/**
 * Onboarding — 3-step first-run wizard.
 * Step 1: Create or join a space.
 * Step 2: Set display name.
 * Step 3: Aurora preference (accessibility / performance opt-out).
 * Renders full-screen with AuroraCanvas background.
 */
export function Onboarding() {
  const navigate       = useNavigate();
  const toggleAurora   = useThemeStore(s => s.toggleAurora);
  const auroraEnabled  = useThemeStore(s => s.auroraEnabled);

  const [step,        setStep]        = useState<Step>('space');
  const [spaceName,   setSpaceName]   = useState('');
  const [joinCode,    setJoinCode]    = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mode,        setMode]        = useState<'create' | 'join'>('create');
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const stepIndex  = STEPS.indexOf(step);
  const totalSteps = STEPS.length;

  async function handleSpaceNext() {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'create') {
        if (!spaceName.trim()) { setError('Space name is required.'); setBusy(false); return; }
        await api.post('/api/v1/spaces', { name: spaceName.trim() });
      } else {
        if (!joinCode.trim()) { setError('Invite code is required.'); setBusy(false); return; }
        await api.post('/api/v1/spaces/join', { code: joinCode.trim() });
      }
      setStep('name');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function handleNameNext() {
    setError(null);
    if (!displayName.trim()) { setError('Display name is required.'); return; }
    setBusy(true);
    try {
      await api.patch('/api/v1/users/me', { display_name: displayName.trim() });
      setStep('aurora');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function handleFinish() {
    navigate('/', { replace: true });
  }

  return (
    <div style={styles.root}>
      <AuroraCanvas />

      <div style={styles.center}>
        {/* Progress dots */}
        <div style={styles.dots} aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{
                ...styles.dot,
                background: i === stepIndex
                  ? 'var(--accent)'
                  : i < stepIndex
                  ? 'var(--accent-emerald)'
                  : 'var(--border-violet)',
                width:  i === stepIndex ? 24 : 8,
              }}
            />
          ))}
        </div>

        <GlassCard
          fill="var(--glass-elevated)"
          radius="var(--radius-card)"
          border="var(--border-violet)"
          padding="var(--space-10) var(--space-8)"
          style={styles.card}
        >
          {/* ── Step 1: Space ──────────────────────────────── */}
          {step === 'space' && (
            <>
              <h1 style={styles.heading}>Welcome to Mercury</h1>
              <p style={styles.sub}>Start by creating a new space or joining one.</p>

              <div style={styles.toggle}>
                <Pill as="button" size="sm" active={mode === 'create'} onClick={() => setMode('create')}>Create</Pill>
                <Pill as="button" size="sm" active={mode === 'join'}   onClick={() => setMode('join')}>Join</Pill>
              </div>

              {mode === 'create' ? (
                <input
                  style={styles.field}
                  placeholder="Space name"
                  value={spaceName}
                  onChange={e => setSpaceName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSpaceNext()}
                  autoFocus
                />
              ) : (
                <input
                  style={styles.field}
                  placeholder="Invite code"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSpaceNext()}
                  autoFocus
                />
              )}

              {error && <p style={styles.error}>{error}</p>}

              <Pill as="button" size="lg" active onClick={handleSpaceNext} disabled={busy} style={styles.cta}>
                {busy ? 'Working…' : 'Continue →'}
              </Pill>
            </>
          )}

          {/* ── Step 2: Display Name ───────────────────────── */}
          {step === 'name' && (
            <>
              <h1 style={styles.heading}>What should we call you?</h1>
              <p style={styles.sub}>Your display name is shown to everyone in your spaces.</p>

              <input
                style={styles.field}
                placeholder="Display name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameNext()}
                autoFocus
                maxLength={32}
              />

              {error && <p style={styles.error}>{error}</p>}

              <Pill as="button" size="lg" active onClick={handleNameNext} disabled={busy} style={styles.cta}>
                {busy ? 'Saving…' : 'Continue →'}
              </Pill>
            </>
          )}

          {/* ── Step 3: Aurora preference ──────────────────── */}
          {step === 'aurora' && (
            <>
              <h1 style={styles.heading}>Aurora effects</h1>
              <p style={styles.sub}>
                Mercury uses animated aurora glow fields in the background.
                You can disable them any time for reduced motion or better performance.
              </p>

              <div style={styles.toggle}>
                <Pill as="button" size="sm" active={auroraEnabled}  onClick={() => !auroraEnabled  && toggleAurora()}>Enabled</Pill>
                <Pill as="button" size="sm" active={!auroraEnabled} onClick={() => auroraEnabled   && toggleAurora()}>Disabled</Pill>
              </div>

              <Pill as="button" size="lg" active onClick={handleFinish} style={styles.cta}>
                Enter Mercury →
              </Pill>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'relative', width: '100vw', height: '100dvh',
    background: 'var(--canvas)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  center:  { position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)' },
  dots:    { display: 'flex', gap: 'var(--space-2)', alignItems: 'center' },
  dot: {
    height: 8, borderRadius: 'var(--radius-pill)',
    transition: `width var(--duration-normal) var(--ease-snap), background var(--duration-normal) var(--ease-snap)`,
  },
  card:    { width: 'min(440px, calc(100vw - 32px))', boxShadow: 'var(--shadow-accent)' },
  heading: {
    fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-wider)',
    marginBottom: 'var(--space-2)',
  },
  sub: {
    fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
    fontFamily: 'var(--font-sans)', lineHeight: 'var(--leading-relaxed)',
    marginBottom: 'var(--space-6)',
  },
  toggle:  { display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' },
  field: {
    width: '100%', marginBottom: 'var(--space-2)',
    background: 'var(--glass-input)', border: '1px solid var(--border-violet)',
    borderRadius: 'var(--radius-pill)', color: 'var(--text-primary)',
    fontSize: 'var(--text-md)', padding: 'var(--space-3) var(--space-4)',
    fontFamily: 'var(--font-sans)',
    outline: 'none',
  },
  error: {
    fontSize: 'var(--text-xs)', color: 'var(--text-danger)',
    fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)',
  },
  cta: { width: '100%', marginTop: 'var(--space-4)', justifyContent: 'center' },
};
