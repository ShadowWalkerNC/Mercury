import { create } from 'zustand';

// ── Modal registry ────────────────────────────────────────────────────────────
export interface ModalPropsMap {
  createSpace:    Record<string, never>;
  createChannel:  { spaceId: string; type?: 'text' | 'voice' };
  inviteMembers:  { spaceId: string };
  settings:       Record<string, never>;
  userSettings:   Record<string, never>;
  twoFactorSetup: Record<string, never>;
}
export type ModalType = keyof ModalPropsMap | null;
type OpenModal = <K extends keyof ModalPropsMap>(type: K, props?: ModalPropsMap[K]) => void;

// ── Toast system ─────────────────────────────────────────────────────────────
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';
export interface Toast {
  id:       string;
  variant:  ToastVariant;
  message:  string;
  duration: number; // ms, 0 = sticky
}

// ── Mobile nav tabs ──────────────────────────────────────────────────────────
export type MobileTab = 'spaces' | 'channels' | 'dms' | 'voice' | 'you';

// ── Channel type ─────────────────────────────────────────────────────────────
export type ChannelType = 'text' | 'voice' | 'dm';

// ── Full state interface ─────────────────────────────────────────────────────
interface UIState {
  // Navigation
  activeSpaceId:    string | null;
  activeChannelId:  string | null;
  activeChannelType:ChannelType;
  activeMobileTab:  MobileTab;

  // Command bar
  commandBarOpen:   boolean;

  // Modal
  modal:            ModalType;
  modalProps:       Partial<ModalPropsMap[keyof ModalPropsMap]>;

  // Toast queue
  toastQueue:       Toast[];

  // Actions
  setActiveSpace:      (id: string | null) => void;
  setActiveChannel:    (id: string | null, type?: ChannelType) => void;
  setActiveMobileTab:  (tab: MobileTab) => void;
  openCommandBar:      () => void;
  closeCommandBar:     () => void;
  openModal:           OpenModal;
  closeModal:          () => void;
  pushToast:           (variant: ToastVariant, message: string, duration?: number) => void;
  dismissToast:        (id: string) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const useUIStore = create<UIState>((set) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  activeSpaceId:     null,
  activeChannelId:   null,
  activeChannelType: 'text',
  activeMobileTab:   'channels',
  commandBarOpen:    false,
  modal:             null,
  modalProps:        {},
  toastQueue:        [],

  // ── Navigation ────────────────────────────────────────────────────────────
  setActiveSpace:   (id) => set({ activeSpaceId: id, activeChannelId: null }),
  setActiveChannel: (id, type = 'text') =>
    set({ activeChannelId: id, activeChannelType: type }),
  setActiveMobileTab: (tab) => set({ activeMobileTab: tab }),

  // ── Command bar ───────────────────────────────────────────────────────────
  openCommandBar:  () => set({ commandBarOpen: true }),
  closeCommandBar: () => set({ commandBarOpen: false }),

  // ── Modals ────────────────────────────────────────────────────────────────
  openModal:  (type, props = {} as never) => set({ modal: type, modalProps: props }),
  closeModal: () => set({ modal: null, modalProps: {} }),

  // ── Toasts ────────────────────────────────────────────────────────────────
  pushToast: (variant, message, duration = 4000) =>
    set((s) => ({
      toastQueue: [
        ...s.toastQueue,
        { id: uid(), variant, message, duration },
      ],
    })),
  dismissToast: (id) =>
    set((s) => ({ toastQueue: s.toastQueue.filter((t) => t.id !== id) })),
}));
