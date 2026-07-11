/**
 * ChatArea — message list + composer for a text channel.
 * M-047: MessageItem with edit/delete/context menu
 * M-049: REACTION_ADD / REACTION_REMOVE WS events
 * M-050: passes attachment metadata through onSend
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { gateway } from '@/lib/gateway';
import { WSOp } from '@mercury/shared';
import { useAuthStore } from '@/stores/authStore';
import { useSpaceStore } from '@/stores/spaceStore';
import { MessageItem, type Message } from './MessageItem';
import { MessageComposer } from './MessageComposer';
import type { Reaction } from './ReactionBar';
import type { AttachmentMeta } from './AttachmentRenderer';

interface Props { spaceId: string; channelId: string; }

export function ChatArea({ spaceId, channelId }: Props) {
  const me                      = useAuthStore(s => s.user);
  const [members, setMembers]   = useState<any[]>([]);
  const myRole  = (members.find((m: { id: string; role: string }) => m.id === me?.id)?.role ?? 'member') as 'owner' | 'admin' | 'member';

  useEffect(() => {
    api.get<any[]>(`/api/v1/spaces/${spaceId}/members`)
      .then(setMembers)
      .catch(() => {});
  }, [spaceId]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    setLoading(true); setMessages([]);
    api.get<Message[]>(`/api/v1/channels/${channelId}/messages`)
      .then(msgs => { setMessages(msgs); setTimeout(scrollToBottom, 50); })
      .finally(() => setLoading(false));
  }, [channelId]);

  useEffect(() => {
    const offs = [
      gateway.on(WSOp.MESSAGE_CREATE, (p) => {
        const msg = p.d as Message & { channel_id: string };
        if (msg.channel_id !== channelId) return;
        setMessages(prev => [...prev, msg]); setTimeout(scrollToBottom, 30);
      }),
      gateway.on(WSOp.MESSAGE_UPDATE, (p) => {
        const msg = p.d as Message & { channel_id: string };
        if (msg.channel_id !== channelId) return;
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
      }),
      gateway.on(WSOp.MESSAGE_DELETE, (p) => {
        const { message_id, channel_id } = p.d as { message_id: string; channel_id: string };
        if (channel_id !== channelId) return;
        setMessages(prev => prev.filter(m => m.id !== message_id));
      }),
      gateway.on(WSOp.REACTION_ADD, (p) => {
        const { message_id, channel_id, emoji, user_id } =
          p.d as { message_id: string; channel_id: string; emoji: string; user_id: string };
        if (channel_id !== channelId) return;
        setMessages(prev => prev.map(m => {
          if (m.id !== message_id) return m;
          const existing = (m.reactions ?? []).find((r: Reaction) => r.emoji === emoji);
          const reactions: Reaction[] = existing
            ? (m.reactions ?? []).map((r: Reaction) => r.emoji === emoji ? { ...r, count: r.count + 1, me: user_id === me?.id ? true : r.me } : r)
            : [...(m.reactions ?? []), { emoji, count: 1, me: user_id === me?.id }];
          return { ...m, reactions };
        }));
      }),
      gateway.on(WSOp.REACTION_REMOVE, (p) => {
        const { message_id, channel_id, emoji, user_id } =
          p.d as { message_id: string; channel_id: string; emoji: string; user_id: string };
        if (channel_id !== channelId) return;
        setMessages(prev => prev.map(m => {
          if (m.id !== message_id) return m;
          const reactions: Reaction[] = (m.reactions ?? [])
            .map((r: Reaction) => r.emoji === emoji ? { ...r, count: r.count - 1, me: user_id === me?.id ? false : r.me } : r)
            .filter((r: Reaction) => r.count > 0);
          return { ...m, reactions };
        }));
      }),
    ];
    return () => offs.forEach(off => off());
  }, [channelId, me?.id]);

  function handleSend(content: string, attachment?: AttachmentMeta) {
    api.post(`/api/v1/channels/${channelId}/messages`, {
      content,
      ...(attachment ? { attachment } : {}),
    }).catch(console.error);
  }

  const channels = useSpaceStore(s => s.channels[spaceId] ?? []);
  const channel  = channels.find(c => c.id === channelId);

  return (
    <div style={css.wrap}>
      <div style={css.header}>
        <span style={{ fontWeight: 700, fontSize: 15 }}># {channel?.name ?? 'loading…'}</span>
      </div>
      <div style={css.list}>
        {loading && <p style={css.muted}>Loading messages…</p>}
        {!loading && messages.length === 0 && <p style={css.muted}>No messages yet. Say hi! 👋</p>}
        {messages.map(msg => (
          <MessageItem
            key={msg.id} message={msg} spaceRole={myRole}
            onDeleted={(id) => setMessages(prev => prev.filter(m => m.id !== id))}
            onEdited={(updated) => setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageComposer channelName={channel?.name ?? ''} onSend={handleSend} />
    </div>
  );
}

const css: Record<string, React.CSSProperties> = {
  wrap:   { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  header: { height: 48, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 8 },
  list:   { flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 2 },
  muted:  { color: 'var(--text-muted)', fontSize: 13, padding: '8px 16px' },
};
