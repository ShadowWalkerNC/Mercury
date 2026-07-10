/**
 * DMChat — full chat view for a single DM conversation.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { gateway } from '@/lib/gateway';
import { WSOp } from '@mercury/shared';
import { MessageItem, type Message } from './MessageItem';
import { MessageComposer } from './MessageComposer';
import type { AttachmentMeta } from './AttachmentRenderer';

export function DMChat() {
  const { dmId } = useParams<{ dmId: string }>();
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [recipient, setRecipient] = useState<{ username: string; display_name: string | null } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!dmId) return;
    setLoading(true); setMessages([]);
    Promise.all([
      api.get<Message[]>(`/api/v1/channels/${dmId}/messages`),
      api.get<{ recipient: typeof recipient }>(`/api/v1/dms/${dmId}`),
    ]).then(([msgs, info]) => {
      setMessages(msgs);
      setRecipient(info.recipient);
      setTimeout(scrollToBottom, 50);
    }).finally(() => setLoading(false));
  }, [dmId]);

  useEffect(() => {
    const offs = [
      gateway.on(WSOp.MESSAGE_CREATE, (p) => {
        const msg = p.d as Message & { channel_id: string };
        if (msg.channel_id !== dmId) return;
        setMessages(prev => [...prev, msg]); setTimeout(scrollToBottom, 30);
      }),
      gateway.on(WSOp.MESSAGE_UPDATE, (p) => {
        const msg = p.d as Message & { channel_id: string };
        if (msg.channel_id !== dmId) return;
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
      }),
      gateway.on(WSOp.MESSAGE_DELETE, (p) => {
        const { message_id, channel_id } = p.d as { message_id: string; channel_id: string };
        if (channel_id !== dmId) return;
        setMessages(prev => prev.filter(m => m.id !== message_id));
      }),
    ];
    return () => offs.forEach(off => off());
  }, [dmId]);

  function handleSend(content: string, attachment?: AttachmentMeta) {
    if (!dmId) return;
    api.post(`/api/v1/channels/${dmId}/messages`, {
      content,
      ...(attachment ? { attachment } : {}),
    }).catch(console.error);
  }

  const name = recipient?.display_name ?? recipient?.username ?? '...';

  return (
    <div style={css.wrap}>
      <div style={css.header}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>@ {name}</span>
      </div>
      <div style={css.list}>
        {loading && <p style={css.muted}>Loading…</p>}
        {!loading && messages.length === 0 && <p style={css.muted}>Start a conversation with {name}!</p>}
        {messages.map(msg => (
          <MessageItem
            key={msg.id} message={msg} spaceRole="member"
            onDeleted={(id) => setMessages(prev => prev.filter(m => m.id !== id))}
            onEdited={(updated) => setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageComposer channelName={name} onSend={handleSend} />
    </div>
  );
}

const css: Record<string, React.CSSProperties> = {
  wrap:   { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  header: { height: 48, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  list:   { flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 2 },
  muted:  { color: 'var(--text-muted)', fontSize: 13, padding: '8px 16px' },
};
