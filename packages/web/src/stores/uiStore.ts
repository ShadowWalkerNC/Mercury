import { create } from 'zustand';

// ── Strongly-typed modal props ──
export interface ModalPropsMap {
  createSpace:    Record<string, never>;
  createChannel:  { spaceId: string; type?: 'text' | 'voice' };
  inviteMembers:  { spaceId: string };
  settings:       Record<string, never>;
  userSettings:   Record<string, never>;
  twoFactorSetup: Record<string, never>;
}

export type ModalType = keyof ModalPropsMap | null;

type OpenModal = <K extends keyof ModalPropsMap>(
  type: K,
  props?: ModalPropsMap[K],
) => void;

interface UIState {
  activeSpaceId:   string | null;
  activeChannelId: string | null;
  sidebarOpen:     boolean;
  modal:           ModalType;
  modalProps:      Partial<ModalPropsMap[keyof ModalPropsMap]>;

  setActiveSpace:   (id: string | null) => void;
  setActiveChannel: (id: string | null) => void;
  toggleSidebar:    () => void;
  openModal:        OpenModal;
  closeModal:       () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeSpaceId: null, activeChannelId: null, sidebarOpen: true, modal: null, modalProps: {},

  setActiveSpace:   (id) => set({ activeSpaceId: id, activeChannelId: null }),
  setActiveChannel: (id) => set({ activeChannelId: id }),
  toggleSidebar:    ()   => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal:        (type, props = {} as never) => set({ modal: type, modalProps: props }),
  closeModal:       ()   => set({ modal: null, modalProps: {} }),
}));
