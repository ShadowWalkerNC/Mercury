import { useEffect, useRef, useState, useMemo } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useSpaceStore } from '../../stores/spaceStore';
import { GlassCard } from './GlassCard';

interface CommandItem {
  id:       string;
  icon:     string;
  label:    string;
  sublabel?: string;
  action:   () => void;
}

/**
 * CommandPalette — ⌘K overlay.
 * Fuzzy search across spaces, channels, and built-in commands.
 * Keyboard navigable: Arrow Up/Down, Enter to select, Escape to close.
 * Renders into #modal-root portal target from AppShell.
 */
export function CommandPalette() {
  const commandBarOpen  = useUIStore(s => s.commandBarOpen);
  const closeCommandBar = useUIStore(s => s.closeCommandBar);
  const setActiveSpace  = useUIStore(s => s.setActiveSpace);
  const spaces          = useSpaceStore(s => s.spaces);

  const [query,    setQuery]    = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef               = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (commandBarOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandBarOpen]);

  // Build full item list
  const allItems = useMemo<CommandItem[]>(() => [
    ...spaces.map(sp => ({
      id:       `space:${sp.id}`,
      icon:     '⊞',
      label:    sp.name,
      sublabel: 'Space',
      action:   () => { setActiveSpace(sp.id); closeCommandBar(); },
    })),
    {
      id:     'cmd:settings',
      icon:   '⚙️',
      label:  'Settings',
      sublabel: 'Command',
      action: () => { useUIStore.getState().openModal('settings'); closeCommandBar(); },
    },
    {
      id:     'cmd:invite',
      icon:   '➕',
      label:  'Invite Members',
      sublabel: 'Command',
      action: () => {
        const spaceId = useUIStore.getState().activeSpaceId;
        if (spaceId) useUIStore.getState().openModal('inviteMembers', { spaceId });
        closeCommandBar();
      },
    },
  ], [spaces]);

  // Fuzzy filter
  const items = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(i =>
      i.label.toLowerCase().includes(q) ||
      (i.sublabel?.toLowerCase().includes(q) ?? false)
    );
  }, [query, allItems]);

  // Keyboard navigation
  useEffect(() => {
    if (!commandBarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     { e.preventDefault(); closeCommandBar(); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter')      { e.preventDefault(); items[selected]?.action(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandBarOpen, items, selected]);

  if (!commandBarOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={styles.backdrop}
        onClick={closeCommandBar}
        aria-hidden="true"
      />

      {/* Palette card */}
      <div style={styles.positioner} role="dialog" aria-modal="true" aria-label="Command palette">
        <GlassCard
          fill="var(--glass-elevated)"
          radius="var(--radius-modal)"
          padding="0"
          style={styles.card}
        >
          {/* Search input */}
          <div style={styles.inputRow}>
            <span style={styles.searchIcon}>⌕</span>
            <input
              ref={inputRef}
              style={styles.input}
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(0); }}
              placeholder="Search spaces, channels, commands…"
              aria-label="Command palette search"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd style={styles.escKbd}>esc</kbd>
          </div>

          {/* Divider */}
          <div style={styles.divider} />

          {/* Results */}
          <ul style={styles.list} role="listbox" aria-label="Results">
            {items.length === 0 && (
              <li style={styles.empty}>No results for “{query}”</li>
            )}
            {items.map((item, i) => (
              <li
                key={item.id}
                role="option"
                aria-selected={i === selected}
                style={{
                  ...styles.item,
                  background: i === selected
                    ? 'rgba(192, 132, 252, 0.10)'
                    : 'transparent',
                  borderLeft: i === selected
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                }}
                onClick={item.action}
                onMouseEnter={() => setSelected(i)}
              >
                <span style={styles.itemIcon}>{item.icon}</span>
                <span style={styles.itemLabel}>{item.label}</span>
                {item.sublabel && (
                  <span style={styles.itemSublabel}>{item.sublabel}</span>
                )}
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div style={styles.footer}>
            <span style={styles.footerHint}><kbd style={styles.kbdSm}>↑↓</kbd> navigate</span>
            <span style={styles.footerHint}><kbd style={styles.kbdSm}>⏎</kbd> select</span>
            <span style={styles.footerHint}><kbd style={styles.kbdSm}>esc</kbd> close</span>
          </div>
        </GlassCard>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 'var(--z-overlay)' as any,
  },
  positioner: {
    position: 'fixed',
    top: '18%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(580px, calc(100vw - 32px))',
    zIndex: 'var(--z-modal)' as any,
  },
  card:      { overflow: 'hidden', boxShadow: 'var(--shadow-lg)' },
  inputRow:  { display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-4)' },
  searchIcon:{ fontSize: 18, color: 'var(--text-accent)', opacity: 0.7, flexShrink: 0 },
  input: {
    flex: 1, border: 'none', background: 'transparent',
    color: 'var(--text-primary)', fontSize: 'var(--text-md)',
    fontFamily: 'var(--font-sans)', outline: 'none',
    letterSpacing: 'var(--tracking-wide)',
  },
  escKbd: {
    fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)', background: 'var(--glass-input)',
    border: '1px solid var(--border-violet)', borderRadius: 'var(--radius-xs)',
    padding: '2px 6px', flexShrink: 0,
  },
  divider: { height: 1, background: 'var(--border-violet)', margin: '0' },
  list:    { listStyle: 'none', maxHeight: 360, overflowY: 'auto', padding: 'var(--space-2) 0' },
  empty:   { padding: 'var(--space-4) var(--space-6)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', textAlign: 'center' },
  item: {
    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
    padding: 'var(--space-2) var(--space-4)',
    cursor: 'pointer',
    transition: `background var(--duration-instant) var(--ease-snap)`,
    borderLeft: '2px solid transparent',
  },
  itemIcon:    { fontSize: 16, flexShrink: 0, width: 22, textAlign: 'center' },
  itemLabel:   { flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' },
  itemSublabel:{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  footer: {
    display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-2) var(--space-4)',
    borderTop: '1px solid var(--border-violet)',
  },
  footerHint:  { display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' },
  kbdSm: {
    fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)', background: 'var(--glass-input)',
    border: '1px solid var(--border-violet)', borderRadius: 'var(--radius-xs)',
    padding: '1px 5px',
  },
};
