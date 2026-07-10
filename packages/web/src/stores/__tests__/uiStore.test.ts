import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

const RESET = {
  activeSpaceId:     null,
  activeChannelId:   null,
  activeChannelType: 'text' as const,
  activeMobileTab:   'channels' as const,
  commandBarOpen:    false,
  modal:             null,
  modalProps:        {},
  toastQueue:        [],
};

beforeEach(() => useUIStore.setState(RESET));

describe('uiStore — navigation', () => {
  it('setActiveSpace updates spaceId and clears channel', () => {
    useUIStore.getState().setActiveChannel('ch1');
    useUIStore.getState().setActiveSpace('sp1');
    expect(useUIStore.getState().activeSpaceId).toBe('sp1');
    expect(useUIStore.getState().activeChannelId).toBeNull();
  });

  it('setActiveChannel updates channelId', () => {
    useUIStore.getState().setActiveChannel('ch1');
    expect(useUIStore.getState().activeChannelId).toBe('ch1');
  });

  it('setActiveChannel defaults type to text', () => {
    useUIStore.getState().setActiveChannel('ch1');
    expect(useUIStore.getState().activeChannelType).toBe('text');
  });

  it('setActiveChannel accepts explicit type', () => {
    useUIStore.getState().setActiveChannel('ch2', 'voice');
    expect(useUIStore.getState().activeChannelType).toBe('voice');
  });

  it('setActiveMobileTab updates tab', () => {
    useUIStore.getState().setActiveMobileTab('dms');
    expect(useUIStore.getState().activeMobileTab).toBe('dms');
  });
});

describe('uiStore — command bar', () => {
  it('openCommandBar sets commandBarOpen true', () => {
    useUIStore.getState().openCommandBar();
    expect(useUIStore.getState().commandBarOpen).toBe(true);
  });

  it('closeCommandBar sets commandBarOpen false', () => {
    useUIStore.getState().openCommandBar();
    useUIStore.getState().closeCommandBar();
    expect(useUIStore.getState().commandBarOpen).toBe(false);
  });
});

describe('uiStore — modals', () => {
  it('openModal sets modal', () => {
    useUIStore.getState().openModal('createSpace');
    expect(useUIStore.getState().modal).toBe('createSpace');
  });

  it('closeModal clears modal', () => {
    useUIStore.getState().openModal('createSpace');
    useUIStore.getState().closeModal();
    expect(useUIStore.getState().modal).toBeNull();
  });

  it('openModal stores props', () => {
    useUIStore.getState().openModal('createChannel', { spaceId: 'sp1', type: 'text' });
    expect((useUIStore.getState().modalProps as any).spaceId).toBe('sp1');
  });
});

describe('uiStore — toasts', () => {
  it('pushToast adds item to queue', () => {
    useUIStore.getState().pushToast('success', 'Saved!');
    expect(useUIStore.getState().toastQueue).toHaveLength(1);
    expect(useUIStore.getState().toastQueue[0].message).toBe('Saved!');
    expect(useUIStore.getState().toastQueue[0].variant).toBe('success');
  });

  it('pushToast assigns unique ids', () => {
    useUIStore.getState().pushToast('info', 'A');
    useUIStore.getState().pushToast('info', 'B');
    const [a, b] = useUIStore.getState().toastQueue;
    expect(a.id).not.toBe(b.id);
  });

  it('pushToast defaults duration to 4000', () => {
    useUIStore.getState().pushToast('info', 'msg');
    expect(useUIStore.getState().toastQueue[0].duration).toBe(4000);
  });

  it('pushToast accepts custom duration', () => {
    useUIStore.getState().pushToast('error', 'err', 0);
    expect(useUIStore.getState().toastQueue[0].duration).toBe(0);
  });

  it('dismissToast removes item by id', () => {
    useUIStore.getState().pushToast('success', 'one');
    useUIStore.getState().pushToast('error',   'two');
    const id = useUIStore.getState().toastQueue[0].id;
    useUIStore.getState().dismissToast(id);
    expect(useUIStore.getState().toastQueue).toHaveLength(1);
    expect(useUIStore.getState().toastQueue[0].message).toBe('two');
  });

  it('dismissToast is no-op for unknown id', () => {
    useUIStore.getState().pushToast('info', 'msg');
    useUIStore.getState().dismissToast('nonexistent');
    expect(useUIStore.getState().toastQueue).toHaveLength(1);
  });
});
