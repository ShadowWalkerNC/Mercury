/**
 * MessageContextMenu — floats at cursor position on message right-click.
 *
 * Items:
 *   Copy Text       — always visible
 *   Edit Message    — own messages only
 *   Delete Message  — own messages, or admin/owner of space
 *
 * Parent is responsible for positioning and dismissal.
 */
import type { CSSProperties } from 'react';

export interface MessageContextAction {
  label:     string;
  danger?:   boolean;
  disabled?: boolean;
  onClick:   () => void;
}

interface Props {
  x:       number;
  y:       number;
  actions: MessageContextAction[];
  onClose: () => void;
}

export function MessageContextMenu({ x, y, actions, onClose }: Props) {
  // Clamp so menu never overflows viewport
  const safeX = Math.min(x, window.innerWidth  - 180);
  const safeY = Math.min(y, window.innerHeight - actions.length * 36 - 16);

  return (
    <>
      {/* Invisible backdrop */}
      <div style={css.backdrop} onMouseDown={onClose} />
      <div style={{ ...css.menu, top: safeY, left: safeX }}>
        {actions.map((a) => (
          <button
            key={a.label}
            disabled={a.disabled}
            style={{
              ...css.item,
              color:   a.danger   ? 'var(--danger)'      : 'var(--text-primary)',
              opacity: a.disabled ? 0.4                  : 1,
              cursor:  a.disabled ? 'not-allowed'        : 'pointer',
            }}
            onClick={() => { a.onClick(); onClose(); }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </>
  );
}

const css: Record<string, CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, zIndex: 1999 },
  menu: {
    position:     'fixed',
    zIndex:       2000,
    background:   'var(--bg-tertiary)',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow:    '0 4px 16px rgba(0,0,0,0.45)',
    minWidth:     164,
    padding:      4,
  },
  item: {
    display:      'block',
    width:        '100%',
    textAlign:    'left',
    padding:      '8px 12px',
    fontSize:     13,
    borderRadius: 'var(--radius-sm)',
    background:   'transparent',
    border:       'none',
    transition:   'background 0.1s',
  },
};
