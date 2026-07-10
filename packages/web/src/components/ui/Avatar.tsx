import type { CSSProperties } from 'react';

type Presence = 'online' | 'idle' | 'dnd' | 'offline';

interface AvatarProps {
  name:      string;
  src?:      string | null;
  size?:     number;
  presence?: Presence;
  style?:    CSSProperties;
}

const PRESENCE_COLOR: Record<Presence, string> = {
  online:  'var(--accent-emerald)',
  idle:    'var(--warning)',
  dnd:     'var(--danger)',
  offline: 'var(--text-muted)',
};

/**
 * Avatar — circular user avatar with optional presence ring.
 * Falls back to uppercase initial when no src provided.
 */
export function Avatar({ name, src, size = 36, presence, style }: AvatarProps) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  const ringColor = presence ? PRESENCE_COLOR[presence] : 'transparent';

  return (
    <div
      style={{
        position:     'relative',
        width:        size,
        height:       size,
        borderRadius: 'var(--radius-icon)',
        flexShrink:   0,
        ...style,
      }}
    >
      {/* Avatar circle */}
      <div
        style={{
          width:         '100%',
          height:        '100%',
          borderRadius:  'var(--radius-icon)',
          overflow:      'hidden',
          display:       'flex',
          alignItems:    'center',
          justifyContent:'center',
          background:    src ? 'transparent' : 'var(--accent-dim)',
          border:        presence
            ? `2px solid ${ringColor}`
            : '2px solid var(--border-violet)',
          fontSize:      size * 0.4,
          fontWeight:    700,
          color:         'var(--text-accent)',
          fontFamily:    'var(--font-sans)',
        }}
      >
        {src
          ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span>{initial}</span>
        }
      </div>

      {/* Presence dot */}
      {presence && presence !== 'offline' && (
        <div
          aria-label={`Status: ${presence}`}
          style={{
            position:     'absolute',
            bottom:       -1,
            right:        -1,
            width:        size * 0.3,
            height:       size * 0.3,
            borderRadius: '50%',
            background:   ringColor,
            border:       '2px solid var(--canvas)',
            boxShadow:    `0 0 6px ${ringColor}`,
          }}
        />
      )}
    </div>
  );
}
