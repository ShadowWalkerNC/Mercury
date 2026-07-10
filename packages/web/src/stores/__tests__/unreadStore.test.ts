import { describe, it, expect, beforeEach } from 'vitest';
import { useUnreadStore } from '../unreadStore';

beforeEach(() => {
  useUnreadStore.setState({ channels: {} });
});

describe('unreadStore', () => {
  it('increments unread on a new message', () => {
    useUnreadStore.getState().increment('ch1', false);
    expect(useUnreadStore.getState().channels['ch1'].unread).toBe(1);
  });

  it('increments mention count when mentioned', () => {
    useUnreadStore.getState().increment('ch1', true);
    const ch = useUnreadStore.getState().channels['ch1'];
    expect(ch.unread).toBe(1);
    expect(ch.mentions).toBe(1);
  });

  it('does not increment mention when not mentioned', () => {
    useUnreadStore.getState().increment('ch1', false);
    expect(useUnreadStore.getState().channels['ch1'].mentions).toBe(0);
  });

  it('markRead resets both counters', () => {
    useUnreadStore.getState().increment('ch1', true);
    useUnreadStore.getState().increment('ch1', true);
    useUnreadStore.getState().markRead('ch1');
    const ch = useUnreadStore.getState().channels['ch1'];
    expect(ch.unread).toBe(0);
    expect(ch.mentions).toBe(0);
  });

  it('markAllRead resets multiple channels', () => {
    useUnreadStore.getState().increment('ch1', false);
    useUnreadStore.getState().increment('ch2', true);
    useUnreadStore.getState().markAllRead(['ch1', 'ch2']);
    expect(useUnreadStore.getState().channels['ch1'].unread).toBe(0);
    expect(useUnreadStore.getState().channels['ch2'].unread).toBe(0);
  });

  it('accumulates across multiple increments', () => {
    for (let i = 0; i < 5; i++) useUnreadStore.getState().increment('ch1', i % 2 === 0);
    const ch = useUnreadStore.getState().channels['ch1'];
    expect(ch.unread).toBe(5);
    expect(ch.mentions).toBe(3); // i=0,2,4 → 3 mentions
  });
});
