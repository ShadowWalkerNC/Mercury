/**
 * notifications.ts — Web Push subscription helpers.
 *
 * Flow:
 *   1. requestPermission()  → asks browser for notification permission
 *   2. subscribe()          → registers SW + creates PushSubscription
 *   3. POST subscription to /api/v1/push/subscribe
 *   4. unsubscribe()        → removes subscription + notifies server
 */
import { api } from './api';

const SW_PATH   = '/sw.js';
const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const pad    = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64    = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export async function subscribe(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const permission = await requestPermission();
  if (permission !== 'granted') return false;

  const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await api.post('/api/v1/push/subscribe', existing.toJSON());
    return true;
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly:      true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
  });
  await api.post('/api/v1/push/subscribe', sub.toJSON());
  return true;
}

export async function unsubscribe(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await sub.unsubscribe();
  await api.post('/api/v1/push/unsubscribe', sub.toJSON()).catch(() => {});
}

export function isSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function currentPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}
