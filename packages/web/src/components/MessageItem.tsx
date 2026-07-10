/**
 * MessageItem — single message row.
 * M-047: context menu, hover toolbar, inline edit
 * M-049: emoji reaction bar
 * M-050: attachment rendering
 */
import { useState, useRef, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
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
  const initial   = name[0]?.toUpperCase() ?? '?';
  const timestamp = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
      style={{ ...css.row, background: hovered ? 'var(--bg-hover)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY }); }}
    >
      <div style={css.avatarWrap}>
        <div style={css.avatar}>
          {message.author.avatar
            ? <img src={message.author.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={name} />
            : <span style={{ fontSize: 16, fontWeight: 700 }}>{initial}</span>}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={css.meta}>
          <span style={css.authorName}>{name}</span>
          <span style={css.ts}>{timestamp}</span>
          {message.edited_at && <span style={css.edited}>(edited)</span>}
        </div>

        {editing ? (
          <form onSubmit={handleEditSubmit} style={{ marginTop: 4 }}>
            <textarea
              ref={editRef} value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') setEditing(false);
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(e as never); }
              }}
              rows={2} style={css.editArea}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button type="submit" disabled={editBusy} style={css.editSave}>{editBusy ? 'Saving…' : 'Save'}</button>
              <button type="button" onClick={() => setEditing(false)} style={css.editCancel}>Cancel</button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Enter to save · Esc to cancel</span>
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

      {hovered && !editing && (
        <div style={css.toolbar}>
          {isMine    && <button style={css.toolBtn} title="Edit"   onClick={startEdit}>&#9998;</button>}
          {canDelete && <button style={{ ...css.toolBtn, color: 'var(--danger)' }} title="Delete" onClick={handleDelete}>&#128465;</button>}
        </div>
      )}

      {ctx && (
        <MessageContextMenu x={ctx.x} y={ctx.y} actions={ctxActions} onClose={() => setCtx(null)} />
      )}
    </div>
  );
}

const css: Record<string, React.CSSProperties> = {
  row:        { display: 'flex', gap: 12, padding: '4px 16px', borderRadius: 4, position: 'relative', transition: 'background 0.08s', minHeight: 44 },
  avatarWrap: { flexShrink: 0, paddingTop: 2 },
  avatar:     { width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  meta:       { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  authorName: { fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' },
  ts:         { fontSize: 11, color: 'var(--text-muted)' },
  edited:     { fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' },
  content:    { fontSize: 14, color: 'var(--text-primary)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  toolbar:    { position: 'absolute', top: 4, right: 12, display: 'flex', gap: 4, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px 4px' },
  toolBtn:    { fontSize: 15, background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 'var(--radius-sm)' },
  editArea:   { width: '100%', resize: 'vertical', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 14, padding: '6px 8px', fontFamily: 'inherit' },
  editSave:   { fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' },
  editCancel: { fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' },
};
