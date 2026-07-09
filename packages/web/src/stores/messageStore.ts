import { create } from 'zustand';
import type { Message } from '@mercury/shared';
import { api } from '@/lib/api';
import { MESSAGES_PAGE_SIZE } from '@mercury/shared';

interface ChannelMessages { messages: Message[]; hasMore: boolean; loading: boolean; }
interface MessageState {
  channels: Record<string, ChannelMessages>;
  fetchMessages:  (channelId: string, before?: string) => Promise<void>;
  appendMessage:  (msg: Message) => void;
  updateMessage:  (msg: Message) => void;
  deleteMessage:  (channelId: string, msgId: string) => void;
  clearChannel:   (channelId: string) => void;
}

const empty = (): ChannelMessages => ({ messages: [], hasMore: true, loading: false });

export const useMessageStore = create<MessageState>((set) => ({
  channels: {},

  async fetchMessages(channelId, before) {
    set((s) => ({ channels: { ...s.channels, [channelId]: { ...(s.channels[channelId] ?? empty()), loading: true } } }));
    try {
      const url = before
        ? `/api/v1/channels/${channelId}/messages?before=${before}`
        : `/api/v1/channels/${channelId}/messages`;
      const msgs = await api.get<Message[]>(url);
      set((s) => {
        const existing = s.channels[channelId]?.messages ?? [];
        return { channels: { ...s.channels, [channelId]: {
          messages: before ? [...msgs, ...existing] : msgs,
          hasMore:  msgs.length >= MESSAGES_PAGE_SIZE,
          loading:  false,
        }}};
      });
    } catch {
      set((s) => ({ channels: { ...s.channels, [channelId]: { ...(s.channels[channelId] ?? empty()), loading: false } } }));
    }
  },

  appendMessage: (msg) => set((s) => ({ channels: { ...s.channels, [msg.channel_id]: {
    ...(s.channels[msg.channel_id] ?? empty()),
    messages: [...(s.channels[msg.channel_id]?.messages ?? []), msg],
  }}})),

  updateMessage: (msg) => set((s) => ({ channels: { ...s.channels, [msg.channel_id]: {
    ...(s.channels[msg.channel_id] ?? empty()),
    messages: (s.channels[msg.channel_id]?.messages ?? []).map(m => m.id === msg.id ? msg : m),
  }}})),

  deleteMessage: (channelId, msgId) => set((s) => ({ channels: { ...s.channels, [channelId]: {
    ...(s.channels[channelId] ?? empty()),
    messages: (s.channels[channelId]?.messages ?? []).filter(m => m.id !== msgId),
  }}})),

  clearChannel: (channelId) => set((s) => ({ channels: { ...s.channels, [channelId]: empty() } })),
}));
