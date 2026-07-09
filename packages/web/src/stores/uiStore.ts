import { create } from 'zustand';

export type ModalType =
  | 'createSpace' | 'createChannel' | 'inviteMembers'
  | 'settings' | 'userSettings' | 'twoFactorSetup' | null;

interface UIState {
  activeSpaceId:   string | null;
  activeChannelId: string | null;
  sidebarOpen:     boolean;
  modal:           ModalType;
  modalProps:      Record<string, unknown>;

  setActiveSpace:   (id: string | null) => void;
  setActiveChannel: (id: string | null) => void;
  toggleSidebar:    () => void;
  openModal:        (type: ModalType, props?: Record<string, unknown>) => void;
  closeModal:       () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeSpaceId: null, activeChannelId: null, sidebarOpen: true, modal: null, modalProps: {},
  setActiveSpace:   (id) => set({ activeSpaceId: id, activeChannelId: null }),
  setActiveChannel: (id) => set({ activeChannelId: id }),
  toggleSidebar:    ()   => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal:        (type, props = {}) => set({ modal: type, modalProps: props }),
  closeModal:       ()   => set({ modal: null, modalProps: {} }),
}));
