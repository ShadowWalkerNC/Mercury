/**
 * ReactionBar — renders existing reactions + emoji picker trigger.
 * Uses only typography, SVG iconography, and no raw emojis.
 */
import { useState } from 'react';
import { api } from '@/lib/api';

export interface Reaction {
  emoji: string;
  count: number;
  me:    boolean;
}

interface Props {
  messageId: string;
  reactions: Reaction[];
  onToggle:  (emoji: string, newReactions: Reaction[]) => void;
}

// Typographical keys for mapping
const REACTION_MAP: Record<string, { label: string; icon: () => JSX.Element }> = {
  '👍': { label: 'LIKE', icon: LikeIcon },
  '👎': { label: 'DISLIKE', icon: DislikeIcon },
  '❤️': { label: 'LOVE', icon: HeartIcon },
  '✅': { label: 'CHECK', icon: CheckIcon },
  '⭐': { label: 'STAR', icon: StarIcon },
  '🔥': { label: 'FIRE', icon: FireIcon },
  '👀': { label: 'EYES', icon: EyesIcon },
  '🚀': { label: 'ROCKET', icon: RocketIcon },
};

const REACTION_KEYS = ['👍', '👎', '❤️', '✅', '⭐', '🔥', '👀', '🚀'];

export function ReactionBar({ messageId, reactions, onToggle }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy,       setBusy]       = useState<string | null>(null);

  async function toggle(emoji: string) {
    if (busy) return;
    setBusy(emoji);
    setPickerOpen(false);
    try {
      const existing = reactions.find(r => r.emoji === emoji);
      if (existing?.me) {
        await api.delete(`/api/v1/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
        onToggle(emoji, reactions
          .map(r => r.emoji !== emoji ? r : r.count <= 1 ? null as never : { ...r, count: r.count - 1, me: false })
          .filter(Boolean));
      } else {
        await api.post(`/api/v1/messages/${messageId}/reactions`, { emoji });
        onToggle(emoji, existing
          ? reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, me: true } : r)
          : [...reactions, { emoji, count: 1, me: true }]);
      }
    } catch (e) { console.error('Reaction failed', e); }
    finally { setBusy(null); }
  }

  function renderReactionItem(emoji: string) {
    const matched = REACTION_MAP[emoji];
    if (matched) {
      const Icon = matched.icon;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon />
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{matched.label}</span>
        </span>
      );
    }
    // Fallback to simple typography if custom emoji
    return <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{emoji.toUpperCase()}</span>;
  }

  if (reactions.length === 0 && !pickerOpen) {
    return (
      <button style={css.addBtn} onClick={() => setPickerOpen(true)} title="Add reaction">
        <AddReactionIcon />
      </button>
    );
  }

  return (
    <div style={css.bar}>
      {reactions.map(r => (
        <button
          key={r.emoji}
          disabled={busy === r.emoji}
          onClick={() => toggle(r.emoji)}
          style={{
            ...css.pill,
            background:  r.me ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
            borderColor: r.me ? 'var(--accent)'     : 'var(--border)',
            fontWeight:  r.me ? 700                 : 400,
            opacity:     busy === r.emoji ? 0.6     : 1,
            color:       r.me ? 'var(--accent-bright)' : 'var(--text-secondary)',
          }}
        >
          {renderReactionItem(r.emoji)}
          <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.8 }}>{r.count}</span>
        </button>
      ))}
      <div style={{ position: 'relative' }}>
        <button style={css.addBtn} onClick={() => setPickerOpen(p => !p)} title="Add reaction">
          <AddReactionIcon />
        </button>
        {pickerOpen && (
          <div style={css.picker}>
            {REACTION_KEYS.map(em => {
              const matched = REACTION_MAP[em];
              const Icon = matched ? matched.icon : null;
              return (
                <button
                  key={em}
                  style={css.pickerBtn}
                  onClick={() => toggle(em)}
                  title={matched ? matched.label : em}
                >
                  {Icon ? <Icon /> : em}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SVG Icons ───

function AddReactionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

function LikeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function DislikeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function EyesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.25-2.5 3.5-2.5 3.5s2.25-1 3.5-2.5L17.5 5.5 18.5 4.5c.5-.5.5-1.5 0-2s-1.5-.5-2 0l-1 1z" />
      <path d="M12 9l-4 4" />
      <path d="M9 12l4-4" />
    </svg>
  );
}

const css: Record<string, React.CSSProperties> = {
  bar:       { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, alignItems: 'center' },
  pill:      { display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 12, border: '1px solid', fontSize: 13, cursor: 'pointer', transition: 'background 0.1s', lineHeight: 1, gap: 2 },
  addBtn:    { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', color: 'var(--text-secondary)' },
  picker:    { position: 'absolute', bottom: '110%', left: 0, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', padding: 8, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, zIndex: 2100, width: 140 },
  pickerBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 4, padding: 2, color: 'var(--text-secondary)', transition: 'background 0.1s' },
};

