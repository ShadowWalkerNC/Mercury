import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useUIStore } from '../stores/uiStore';
import { AuroraCanvas } from './layout/AuroraCanvas';
import { CommandBar } from './layout/CommandBar';
import { SpaceRail } from './layout/SpaceRail';
import { ContentStream } from './layout/ContentStream';
import { MobileNav } from './layout/MobileNav';
import '../styles/global.css';

/**
 * AppShell — Command Stream layout root.
 *
 * Layer order (z-index):
 *   0  AuroraCanvas   — fixed aurora glow fields (pointer-events: none)
 *   1  Shell body     — flex row filling viewport
 *      ├ SpaceRail    — desktop-only circular icon rail (z-panel)
 *      └ ContentStream— fluid glass card: sidebar + chat + presence
 *  20  CommandBar     — global ⌘K pill pinned top-center
 *  30  MobileNav      — mobile-only bottom tab bar
 *  50+ Modals/toasts  — handled by uiStore portal targets
 */
export function AppShell() {
  const openCommandBar = useUIStore(s => s.openCommandBar);

  // Global ⌘K shortcut
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
      {/* Layer 0 — aurora background */}
      <AuroraCanvas />

      {/* Layer 1 — app body */}
      <div style={styles.body}>
        {/* Desktop space icon rail */}
        <SpaceRail />

        {/* Fluid content stream */}
        <ContentStream />
      </div>

      {/* Layer 20 — global command bar */}
      <CommandBar />

      {/* Layer 30 — mobile bottom nav */}
      <MobileNav />

      {/* Portal targets for modals and toasts */}
      <div id="modal-root" style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)' as any, pointerEvents: 'none' }} />
      <div id="toast-root" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 'var(--z-toast)' as any, pointerEvents: 'none' }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'relative',
    width: '100vw',
    height: '100dvh',
    overflow: 'hidden',
    background: 'var(--canvas)',
    isolation: 'isolate',
  },
  body: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    zIndex: 1,
    // Leave top padding for CommandBar pill
    paddingTop: 'calc(var(--command-bar-height) + 16px)',
    // Leave bottom padding on mobile for MobileNav
    paddingBottom: 0,
  },
};
