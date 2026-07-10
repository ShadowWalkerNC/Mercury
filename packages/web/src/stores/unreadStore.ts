/**
 * unreadStore — tracks unread message counts and mention counts per channel.
 *
 * Shape: { [channelId]: { unread: number; mentions: number } }
 *
 * Updated by:
 *   - WS MESSAGE_CREATE  → increment unread (+ mentions if @me)
 *   - markRead(channelId) → reset to 0 (called when channel becomes active)
 */
import { create } from 'zustand';

interface ChannelUnread {
  unread:   number;
  mentions: number;
}

interface UnreadStore {
  channels: Record<string, ChannelUnread>;
  increment:  (channelId: string, mentioned: boolean) => void;
  markRead:   (channelId: string) => void;
  markAllRead:(spaceChannelIds: string[]) => void;
}

export const useUnreadStore = create<UnreadStore>((set) => ({
  channels: {},

  increment: (channelId, mentioned) =>
    set(s => ({
      channels: {
        ...s.channels,
        [channelId]: {
          unread:   (s.channels[channelId]?.unread   ?? 0) + 1,
          mentions: (s.channels[channelId]?.mentions ?? 0) + (mentioned ? 1 : 0),
        },
      },
    })),

  markRead: (channelId) =>
    set(s => ({
      channels: { ...s.channels, [channelId]: { unread: 0, mentions: 0 } },
    })),

  markAllRead: (ids) =>
    set(s => {
      const channels = { ...s.channels };
      ids.forEach(id => { channels[id] = { unread: 0, mentions: 0 }; });
      return { channels };
    }),
}));
