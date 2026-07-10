/**
 * MessageItem — Command Stream visual language.
 * Stage 3: token-driven spacing, user accent colors, glass hover,
 * pill edit/cancel actions, Avatar primitive, preserved logic.
 */
import { useState, useRef, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from './ui/Avatar';
import { Pill } from './ui/Pill';
import { MessageContextMenu, type MessageContextAction } from './MessageContextMenu';
import { ReactionBar, type Reaction } from './ReactionBar';
import { AttachmentRenderer, type AttachmentMeta } from './AttachmentRenderer';

export interface Message {
  id:          string;
  author_id:   string;
  author:      { id: string; username: string; display_name: string | null; avatar: string | null };
  content:     string;
  created_at:  string;
  edited_at:   string | null;
  reactions?:  Reaction[];
  attachment?: AttachmentMeta;
}

interface Props {
  message:   Message;
  spaceRole: 'owner' | 'admin' | 'member';
  onDeleted: (id: string) => void;
  onEdited:  (updated: Message) => void;
}

// Deterministic accent color per user — cycles through token palette
const USER_COLORS = [
  'var(--accent)',
  'var(--accent-emerald)',
  'var(--accent-cyan)',
  '#a78bfa',  // soft violet
  '#f472b6',  // pink
  '#34d399',  // teal
  '#60a5fa',  // blue
];
function userColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return USER_COLORS[h % USER_COLORS.length];
}

export function MessageItem({ message, spaceRole, onDeleted, onEdited }: Props) {
  const me        = useAuthStore(s => s.user);
  const isMine    = me?.id === message.author_id;
  const canDelete = isMine || spaceRole === 'owner' || spaceRole === 'admin';

  const [hovered,   setHovered]   = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [editVal,   setEditVal]   = useState(message.content);
  const [editBusy,  setEditBusy]  = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>(message.reactions ?? []);
  const [ctx,       setCtx]       = useState<{ x: number; y: number } | null>(null);
  const editRef                   = useRef<HTMLTextAreaElement>(null);

  const name      = message.author.display_name ?? message.author.username;
  const timestamp = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const accentCol = userColor(message.author_id);

  async function handleDelete() {
    try { await api.delete(`/api/v1/messages/${message.id}`); onDeleted(message.id); }
    catch (e) { console.error('Delete failed', e); }
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editVal.trim() || editVal === message.content) { setEditing(false); return; }
    setEditBusy(true);
    try {
      const updated = await api.patch<Message>(`/api/v1/messages/${message.id}`, { content: editVal.trim() });
      onEdited(updated); setEditing(false);
    } catch (err) { console.error('Edit failed', err); }
    finally { setEditBusy(false); }
  }

  function startEdit() {
    setEditVal(message.content); setEditing(true);
    setTimeout(() => editRef.current?.focus(), 0);
  }

  const ctxActions: MessageContextAction[] = [
    { label: 'Copy Text',      onClick: () => navigator.clipboard.writeText(message.content) },
    ...(isMine    ? [{ label: 'Edit Message',   onClick: startEdit }] : []),
    ...(canDelete ? [{ label: 'Delete Message', danger: true, onClick: handleDelete }] : []),
  ];

  return (
    <div
      style={{
        ...css.row,
        background: hovered ? 'rgba(180, 120, 255, 0.04)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY }); }}
    >
      {/* Avatar */}
      <Avatar
        name={name}
        src={message.author.avatar}
        size={36}
        style={{ marginTop: 2, flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Meta row */}
        <div style={css.meta}>
          <span style={{ ...css.authorName, color: accentCol }}>{name}</span>
          <span style={css.ts}>{timestamp}</span>
          {message.edited_at && <span style={css.edited}>(edited)</span>}
        </div>

        {/* Content or edit form */}
        {editing ? (
          <form onSubmit={handleEditSubmit} style={{ marginTop: 'var(--space-2)' }}>
            <textarea
              ref={editRef}
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') setEditing(false);
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(e as never); }
              }}
              rows={2}
              style={css.editArea}
            />
            <div style={css.editActions}>
              <Pill
                as="button"
                size="sm"
                active
                fill="var(--accent-dim)"
                type="submit"
                disabled={editBusy}
              >
                {editBusy ? 'Saving…' : 'Save'}
              </Pill>
              <Pill
                as="button"
                size="sm"
                type="button"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Pill>
              <span style={css.editHint}>Enter to save · Esc to cancel</span>
            </div>
          </form>
        ) : (
          <>
            {message.content && <p style={css.content}>{message.content}</p>}
            {message.attachment && <AttachmentRenderer attachment={message.attachment} />}
          </>
        )}

        <ReactionBar
          messageId={message.id}
          reactions={reactions}
          onToggle={(_, next) => setReactions(next)}
        />
      </div>

      {/* Hover toolbar */}
      {hovered && !editing && (
        <div style={css.toolbar}>
          {isMine && (
            <button
              style={css.toolBtn}
              title="Edit message"
              aria-label="Edit message"
              onClick={startEdit}
            >
              ✎
            </button>
          )}
          {canDelete && (
            <button
              style={{ ...css.toolBtn, color: 'var(--danger)' }}
              title="Delete message"
              aria-label="Delete message"
              onClick={handleDelete}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {ctx && (
        <MessageContextMenu
          x={ctx.x} y={ctx.y}
          actions={ctxActions}
          onClose={() => setCtx(null)}
        />
      )}
    </div>
  );
}

const css: Record<string, React.CSSProperties> = {
  row: {
    display:      'flex',
    gap:          'var(--space-3)',
    padding:      'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-sm)',
    position:     'relative',
    transition:   `background var(--duration-instant) var(--ease-snap)`,
    minHeight:    44,
    alignItems:   'flex-start',
  },
  meta: {
    display:     'flex',
    alignItems:  'baseline',
    gap:         'var(--space-2)',
    marginBottom:'var(--space-1)',
  },
  authorName: {
    fontSize:   'var(--text-sm)',
    fontWeight: 700,
    fontFamily: 'var(--font-sans)',
    letterSpacing: 'var(--tracking-wide)',
  },
  ts: {
    fontSize:   'var(--text-xs)',
    color:      'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  edited: {
    fontSize:  'var(--text-xs)',
    color:     'var(--text-muted)',
    fontStyle: 'italic',
  },
  content: {
    fontSize:   'var(--text-base)',
    color:      'var(--text-primary)',
    margin:     0,
    whiteSpace: 'pre-wrap',
    wordBreak:  'break-word',
    lineHeight: 'var(--leading-relaxed)',
    fontFamily: 'var(--font-sans)',
  },
  toolbar: {
    position:   'absolute',
    top:        'var(--space-2)',
    right:      'var(--space-3)',
    display:    'flex',
    gap:        'var(--space-1)',
    background: 'var(--glass-elevated)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border:     '1px solid var(--border-violet)',
    borderRadius: 'var(--radius-sm)',
    padding:    '3px var(--space-2)',
  },
  toolBtn: {
    fontSize:     15,
    background:   'transparent',
    border:       'none',
    cursor:       'pointer',
    padding:      '2px var(--space-2)',
    borderRadius: 'var(--radius-xs)',
    color:        'var(--text-secondary)',
    transition:   `color var(--duration-fast) var(--ease-snap)`,
  },
  editArea: {
    width:        '100%',
    resize:       'vertical',
    background:   'var(--glass-input)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border:       '1px solid var(--border-violet)',
    borderRadius: 'var(--radius-sm)',
    color:        'var(--text-primary)',
    fontSize:     'var(--text-base)',
    padding:      'var(--space-2) var(--space-3)',
    fontFamily:   'var(--font-sans)',
    lineHeight:   'var(--leading-normal)',
  },
  editActions: {
    display:    'flex',
    gap:        'var(--space-2)',
    marginTop:  'var(--space-2)',
    alignItems: 'center',
  },
  editHint: {
    fontSize:  'var(--text-xs)',
    color:     'var(--text-muted)',
    fontFamily:'var(--font-mono)',
  },
};
