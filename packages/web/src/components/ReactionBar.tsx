/**
 * ReactionBar — renders existing reactions + emoji picker trigger.
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

const EMOJI_SET = [
  '👍','👎','❤️','😂','😮','😢','😡','🎉',
  '🔥','✅','👀','🙏','💯','🚀','⭐','😎',
];

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

  if (reactions.length === 0 && !pickerOpen) {
    return (
      <button style={css.addBtn} onClick={() => setPickerOpen(true)} title="Add reaction">🙂+</button>
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
          }}
        >
          {r.emoji} <span style={{ fontSize: 11, marginLeft: 3 }}>{r.count}</span>
        </button>
      ))}
      <div style={{ position: 'relative' }}>
        <button style={css.addBtn} onClick={() => setPickerOpen(p => !p)} title="Add reaction">+</button>
        {pickerOpen && (
          <div style={css.picker}>
            {EMOJI_SET.map(em => (
              <button key={em} style={css.pickerBtn} onClick={() => toggle(em)}>{em}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const css: Record<string, React.CSSProperties> = {
  bar:       { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, alignItems: 'center' },
  pill:      { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 12, border: '1px solid', fontSize: 14, cursor: 'pointer', transition: 'background 0.1s', lineHeight: 1.4 },
  addBtn:    { fontSize: 14, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 12, padding: '2px 8px', cursor: 'pointer', color: 'var(--text-secondary)' },
  picker:    { position: 'absolute', bottom: '110%', left: 0, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', padding: 8, display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 4, zIndex: 2100, width: 224 },
  pickerBtn: { fontSize: 18, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 4, padding: 2, lineHeight: 1 },
};
