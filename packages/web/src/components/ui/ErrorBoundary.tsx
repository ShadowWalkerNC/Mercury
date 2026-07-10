import { Component, type ReactNode, type ErrorInfo } from 'react';
import { GlassCard } from './GlassCard';
import { Pill } from './Pill';

interface Props   { children: ReactNode; fallbackLabel?: string; }
interface State   { error: Error | null; }

/**
 * ErrorBoundary — React error boundary with Command Stream recovery UI.
 * Wraps all route-level pages in App.tsx.
 * Shows a glass card with error message + reload/reset options.
 * Never shows a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Mercury ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={styles.wrapper}>
        <GlassCard
          fill="var(--glass-elevated)"
          radius="var(--radius-card)"
          border="var(--border-danger)"
          padding="var(--space-10) var(--space-8)"
          style={styles.card}
        >
          <div style={styles.icon} aria-hidden="true">⚠️</div>
          <h2 style={styles.headline}>
            {this.props.fallbackLabel ?? 'Something went wrong'}
          </h2>
          <p style={styles.message}>
            {this.state.error.message}
          </p>
          <div style={styles.actions}>
            <Pill as="button" size="lg" onClick={this.reset}>
              Try again
            </Pill>
            <Pill as="button" size="lg" active onClick={() => window.location.reload()}>
              Reload page
            </Pill>
          </div>
        </GlassCard>
      </div>
    );
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100vw', height: '100dvh',
    background: 'var(--canvas)',
  },
  card: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', maxWidth: 420, boxShadow: 'var(--shadow-lg)',
  },
  icon:      { fontSize: 48, marginBottom: 'var(--space-4)' },
  headline: {
    fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-wide)',
    marginBottom: 'var(--space-3)',
  },
  message: {
    fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)', lineHeight: 'var(--leading-relaxed)',
    marginBottom: 'var(--space-6)', wordBreak: 'break-word',
  },
  actions: { display: 'flex', gap: 'var(--space-3)' },
};
