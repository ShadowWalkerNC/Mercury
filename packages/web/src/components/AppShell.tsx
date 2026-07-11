import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useThemeStore } from '../stores/themeStore';
import { useSpaceStore } from '../stores/spaceStore';
import { AuroraCanvas } from './layout/AuroraCanvas';
import { CommandBar } from './layout/CommandBar';
import { SpaceRail } from './layout/SpaceRail';
import { ContentStream } from './layout/ContentStream';
import { MobileNav } from './layout/MobileNav';
import { CommandPalette } from './ui/CommandPalette';
import { ToastManager } from './ui/ToastManager';
import { ErrorBoundary } from './ui/ErrorBoundary';
import '../styles/global.css';

/**
 * AppShell — Command Stream layout root.
 * Stage 6: ToastManager, CommandPalette, ErrorBoundary wired in.
 * Skip-to-content link added for keyboard/screen-reader users.
 */
export function AppShell() {
  const openCommandBar = useUIStore(s => s.openCommandBar);
  const auroraEnabled  = useThemeStore(s => s.auroraEnabled);
  const fetchSpaces    = useSpaceStore(s => s.fetchSpaces);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandBar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openCommandBar]);

  return (
    <div style={styles.root}>
      {/* WCAG 2.4.1 skip link */}
      <a href="#main-content" className="skip-to-content">Skip to content</a>

      {/* Layer 0 — aurora background (respects auroraEnabled + prefers-reduced-motion) */}
      {auroraEnabled && <AuroraCanvas />}

      {/* Layer 1 — app body */}
      <div style={styles.body}>
        <SpaceRail />
        <ErrorBoundary>
          <ContentStream />
        </ErrorBoundary>
      </div>

      {/* Layer 20 — command bar */}
      <CommandBar />

      {/* Layer 30 — mobile bottom nav */}
      <MobileNav />

      {/* Overlays — command palette + toasts */}
      <CommandPalette />
      <ToastManager />

      {/* Portal targets */}
      <div
        id="modal-root"
        style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)' as any, pointerEvents: 'none' }}
      />
      <div
        id="toast-root"
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 'var(--z-toast)' as any, pointerEvents: 'none' }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position:   'relative',
    width:      '100vw',
    height:     '100dvh',
    overflow:   'hidden',
    background: 'var(--canvas)',
    isolation:  'isolate',
  },
  body: {
    position:      'relative',
    display:       'flex',
    flexDirection: 'row',
    width:         '100%',
    height:        '100%',
    zIndex:        1,
    paddingTop:    'calc(var(--command-bar-height) + 16px)',
  },
};
