import { create } from 'zustand';
import type { Space, Channel } from '@mercury/shared';
import { api } from '@/lib/api';

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
}

export const useSpaceStore = create<SpaceState>((set) => ({
  spaces: [], channels: {}, loading: false,

  async fetchSpaces() {
    set({ loading: true });
    try { set({ spaces: await api.get<Space[]>('/api/v1/spaces') }); }
    finally { set({ loading: false }); }
  },

  async fetchChannels(spaceId) {
    set((s) => ({ channels: { ...s.channels, [spaceId]: await api.get<Channel[]>(`/api/v1/spaces/${spaceId}/channels`) } }));
  },

  addSpace:    (space)   => set((s) => ({ spaces: [...s.spaces, space] })),
  updateSpace: (space)   => set((s) => ({ spaces: s.spaces.map(sp => sp.id === space.id ? space : sp) })),
  removeSpace: (id)      => set((s) => ({ spaces: s.spaces.filter(sp => sp.id !== id) })),

  addChannel: (ch) => set((s) => ({
    channels: { ...s.channels, [ch.space_id!]: [...(s.channels[ch.space_id!] ?? []), ch] },
  })),
  updateChannel: (ch) => set((s) => ({
    channels: { ...s.channels, [ch.space_id!]: (s.channels[ch.space_id!] ?? []).map(c => c.id === ch.id ? ch : c) },
  })),
  removeChannel: (spaceId, channelId) => set((s) => ({
    channels: { ...s.channels, [spaceId]: (s.channels[spaceId] ?? []).filter(c => c.id !== channelId) },
  })),
}));
