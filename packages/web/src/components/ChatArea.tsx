/**
 * ChatArea — the main right panel.
 *
 * Layout (flex column, fills remaining width):
 *   Channel header (#name)
 *   Message list (scrollable, load-older at top)
 *   MessageInput (textarea + send button)
 *
 * Live WS events:
 *   WSOp.MESSAGE_CREATE → appendMessage
 *   WSOp.MESSAGE_UPDATE → updateMessage
 *   WSOp.MESSAGE_DELETE → deleteMessage
 *
 * Scroll behaviour:
 *   - Channel change / initial load: scroll to bottom
 *   - New message: scroll to bottom only if already near bottom
 *   - Load older: preserve scroll position via scrollHeight diff
 */
import {
  useEffect, useRef, useLayoutEffect, useState,
  useCallback, type FormEvent, type KeyboardEvent,
} from 'react';
import { useMessageStore } from '@/stores/messageStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { useAuthStore } from '@/stores/authStore';
import { gateway } from '@/lib/gateway';
import { api } from '@/lib/api';
import { WSOp } from '@mercury/shared';
import type { Message, WSPayload } from '@mercury/shared';

interface Props { spaceId: string; channelId: string; }

export function ChatArea({ spaceId, channelId }: Props) {
  const channels = useSpaceStore(s => s.channels[spaceId] ?? []);
  const channel  = channels.find(c => c.id === channelId);

  const { channels: msgChannels, fetchMessages, appendMessage, updateMessage, deleteMessage } = useMessageStore();
  const state = msgChannels[channelId];

  const scrollRef   = useRef<HTMLDivElement>(null);
  const prevScrollH = useRef<number>(0);
  const isAtBottom  = useRef(true);
  const initialLoad = useRef(true);

  useEffect(() => {
    initialLoad.current = true;
    fetchMessages(channelId);
  }, [channelId]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (initialLoad.current) {
      el.scrollTop = el.scrollHeight;
      initialLoad.current = false;
      return;
    }
    if (isAtBottom.current) el.scrollTop = el.scrollHeight;
  }, [state?.messages.length]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || initialLoad.current) return;
    if (!isAtBottom.current) el.scrollTop = el.scrollHeight - prevScrollH.current;
  }, [state?.messages[0]?.id]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function handleLoadOlder() {
    const el = scrollRef.current;
    if (el) prevScrollH.current = el.scrollHeight;
    fetchMessages(channelId, state?.messages[0]?.id);
  }

  useEffect(() => {
    const offCreate = gateway.on(WSOp.MESSAGE_CREATE, (p: WSPayload) => {
      const msg = p.d as Message;
      if (msg.channel_id === channelId) appendMessage(msg);
    });
    const offUpdate = gateway.on(WSOp.MESSAGE_UPDATE, (p: WSPayload) => {
      const msg = p.d as Message;
      if (msg.channel_id === channelId) updateMessage(msg);
    });
    const offDelete = gateway.on(WSOp.MESSAGE_DELETE, (p: WSPayload) => {
      const { channel_id, id } = p.d as { channel_id: string; id: string };
      if (channel_id === channelId) deleteMessage(channelId, id);
    });
    return () => { offCreate(); offUpdate(); offDelete(); };
  }, [channelId]);

  return (
    <div style={css.area}>
      <header style={css.header}>
        <span style={{ opacity: 0.5, marginRight: 4 }}>#</span>
        <span style={{ fontWeight: 700 }}>{channel?.name ?? '…'}</span>
      </header>

      <div ref={scrollRef} style={css.messageList} onScroll={handleScroll}>
        {state?.hasMore && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <button style={css.loadOlderBtn} onClick={handleLoadOlder} disabled={state.loading}>
              {state.loading ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        )}
        {(state?.messages ?? []).map((msg, i, arr) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            compact={
              i > 0 &&
              arr[i - 1]!.author_id === msg.author_id &&
              new Date(msg.created_at).getTime() - new Date(arr[i - 1]!.created_at).getTime() < 5 * 60_000
            }
          />
        ))}
      </div>

      <MessageInput channelId={channelId} channelName={channel?.name ?? ''} />
    </div>
  );
}

// ─── MessageBubble ───

function MessageBubble({ msg, compact }: { msg: Message; compact: boolean }) {
  const user  = useAuthStore(s => s.user);
  const isOwn = msg.author_id === user?.id;
  const time  = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const author = msg.author as { username: string; avatar?: string } | undefined;

  if (compact) {
    return (
      <div style={css.compactMsg}>
        <span style={css.compactTime}>{time}</span>
        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span>
        {msg.edited_at && <span style={css.edited}>(edited)</span>}
      </div>
    );
  }

  return (
    <div style={css.msg}>
      <div style={css.msgAvatar}>
        {author?.avatar
          ? <img src={author.avatar} alt={author.username}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 12, fontWeight: 700 }}>{author?.username?.[0]?.toUpperCase()}</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={css.msgMeta}>
          <span style={{ fontWeight: 600, color: isOwn ? 'var(--accent)' : 'var(--text-primary)' }}>
            {author?.username ?? 'Unknown'}
          </span>
          <span style={css.msgTime}>{time}</span>
        </div>
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 15, lineHeight: '1.5' }}>
          {msg.content}
          {msg.edited_at && <span style={css.edited}> (edited)</span>}
        </div>
      </div>
    </div>
  );
}

// ─── MessageInput ───

function MessageInput({ channelId, channelName }: { channelId: string; channelName: string }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(async () => {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setText('');
    try {
      await api.post(`/api/v1/channels/${channelId}/messages`, { content });
    } catch {
      setText(content);
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
    }
  }, [text, busy, channelId]);

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(); }
  }

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); void submit(); }} style={css.inputRow}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder={`Message #${channelName}`}
        rows={1}
        style={css.textarea}
        disabled={busy}
      />
      <button type="submit" disabled={!text.trim() || busy} style={css.sendBtn}>
        <SendIcon />
      </button>
    </form>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

// ─── Styles ───

const css = {
  area:         { flex: 1, display: 'flex', flexDirection: 'column' as const, height: '100%', minWidth: 0, background: 'var(--bg-primary)' },
  header:       { height: 48, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, fontSize: 16, color: 'var(--text-primary)' },
  messageList:  { flex: 1, overflowY: 'auto' as const, padding: '8px 0', display: 'flex', flexDirection: 'column' as const },
  loadOlderBtn: { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '6px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, cursor: 'pointer', border: '1px solid var(--border)' },
  msg:          { display: 'flex', gap: 12, padding: '4px 16px', alignItems: 'flex-start', marginTop: 8 },
  msgAvatar:    { width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', marginTop: 2 },
  msgMeta:      { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  msgTime:      { fontSize: 11, color: 'var(--text-muted)' },
  compactMsg:   { display: 'flex', alignItems: 'baseline', gap: 8, padding: '1px 16px 1px 68px', fontSize: 15 },
  compactTime:  { fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, minWidth: 40 },
  edited:       { fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 },
  inputRow:     { padding: '0 16px 16px', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end' },
  textarea:     { flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)', resize: 'none' as const, outline: 'none', fontSize: 15, lineHeight: '1.5', minHeight: 44, maxHeight: 200, overflowY: 'auto' as const },
  sendBtn:      { background: 'var(--accent)', color: '#fff', width: 40, height: 40, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
} satisfies Record<string, React.CSSProperties>;
