import webpush from 'web-push';
import { db } from '../db.js';

const VAPID_PUBLIC_KEY = process.env['VAPID_PUBLIC_KEY'];
const VAPID_PRIVATE_KEY = process.env['VAPID_PRIVATE_KEY'];
const VAPID_SUBJECT = process.env['VAPID_SUBJECT'] || 'mailto:admin@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function sendPushNotification(
  userIds: string[],
  payload: { title: string; body: string; icon?: string; data?: any }
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const placeholders = userIds.map(() => '?').join(',');
  if (placeholders.length === 0) return;

  const subs = db.prepare(`
    SELECT endpoint, p256dh, auth FROM push_subscriptions
    WHERE user_id IN (${placeholders})
  `).all(...userIds) as { endpoint: string; p256dh: string; auth: string }[];

  for (const sub of subs) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    webpush.sendNotification(pushSubscription, JSON.stringify(payload)).catch(err => {
      // Clean up expired or invalid subscriptions (status 410 Gone / 404 Not Found)
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
      }
    });
  }
}
