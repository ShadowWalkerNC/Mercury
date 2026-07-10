import { create } from 'zustand';
import type { Space, Channel } from '@mercury/shared';
import { api } from '@/lib/api';
import { gateway } from '@/lib/gateway';
import { WSOp } from '@mercury/shared';

interface SpaceState {
  spaces:   Space[];
  channels: Record<string, Channel[]>;
  loading:  boolean;

  fetchSpaces:   () => Promise<void>;
  fetchChannels: (spaceId: string) => Promise<void>;
  addSpace:      (space: Space) => void;
  updateSpace:   (space: Space) => void;
  removeSpace:   (id: string) => void;
  addChannel:    (channel: Channel) => void;
  updateChannel: (channel: Channel) => void;
  removeChannel: (spaceId: string, channelId: string) => void;

  /** Call once after gateway connects to subscribe to live WS events. */
  subscribeWS: () => () => void;
}

export const useSpaceStore = create<SpaceState>((set, get) => ({
  spaces: [], channels: {}, loading: false,

  async fetchSpaces() {
    set({ loading: true });
    try { set({ spaces: await api.get<Space[]>('/api/v1/spaces') }); }
    finally { set({ loading: false }); }
  },

  async fetchChannels(spaceId) {
    set((s) => ({
      channels: {
        ...s.channels,
        [spaceId]: [],  // optimistic clear so old data doesn’t flash
      },
    }));
    const chs = await api.get<Channel[]>(`/api/v1/spaces/${spaceId}/channels`);
    set((s) => ({ channels: { ...s.channels, [spaceId]: chs } }));
  },

  addSpace:    (space)   => set((s) => ({ spaces: [...s.spaces, space] })),
  updateSpace: (space)   => set((s) => ({ spaces: s.spaces.map(sp => sp.id === space.id ? space : sp) })),
  removeSpace: (id)      => set((s) => ({ spaces: s.spaces.filter(sp => sp.id !== id) })),

  addChannel: (ch) => set((s) => ({
    channels: {
      ...s.channels,
      [ch.space_id!]: [...(s.channels[ch.space_id!] ?? []), ch],
    },
  })),
  updateChannel: (ch) => set((s) => ({
    channels: {
      ...s.channels,
      [ch.space_id!]: (s.channels[ch.space_id!] ?? []).map(c => c.id === ch.id ? ch : c),
    },
  })),
  removeChannel: (spaceId, channelId) => set((s) => ({
    channels: {
      ...s.channels,
      [spaceId]: (s.channels[spaceId] ?? []).filter(c => c.id !== channelId),
    },
  })),

  subscribeWS() {
    const { addSpace, updateSpace, removeSpace, addChannel, updateChannel, removeChannel } = get();

    const offs = [
      gateway.on(WSOp.SPACE_CREATE,  (p) => addSpace(p.d as Space)),
      gateway.on(WSOp.SPACE_UPDATE,  (p) => updateSpace(p.d as Space)),
      gateway.on(WSOp.SPACE_DELETE,  (p) => removeSpace((p.d as { id: string }).id)),

      gateway.on(WSOp.CHANNEL_CREATE, (p) => addChannel(p.d as Channel)),
      gateway.on(WSOp.CHANNEL_UPDATE, (p) => updateChannel(p.d as Channel)),
      gateway.on(WSOp.CHANNEL_DELETE, (p) => {
        const { space_id, id } = p.d as { space_id: string; id: string };
        removeChannel(space_id, id);
      }),
    ];

    return () => offs.forEach(off => off());
  },
}));
