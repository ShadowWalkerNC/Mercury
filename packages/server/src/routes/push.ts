import { Router } from 'express';
import { db } from '../db.js';
import { ulid } from '../utils/ulid.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const pushRouter = Router();
pushRouter.use(requireAuth);

interface PushSubBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// POST /api/v1/push/subscribe
// Registers a browser push subscription for the logged-in user.
pushRouter.post(
  '/subscribe',
  validateBody({
    endpoint: { type: 'string', min: 1, max: 2048 }
  }),
  (req: AuthRequest, res) => {
    const { endpoint, keys } = req.body as PushSubBody;

    if (!keys || typeof keys !== 'object' || !keys.p256dh || !keys.auth) {
      res.status(400).json({ error: 'Invalid subscription keys' });
      return;
    }

    const id = ulid();
    db.prepare(`
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth
    `).run(id, req.userId, endpoint, keys.p256dh, keys.auth);

    res.status(201).json({ success: true });
  }
);

// POST /api/v1/push/unsubscribe
// Removes a browser push subscription.
pushRouter.post(
  '/unsubscribe',
  validateBody({
    endpoint: { type: 'string', min: 1, max: 2048 }
  }),
  (req: AuthRequest, res) => {
    const { endpoint } = req.body as { endpoint: string };
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
    res.status(204).send();
  }
);
