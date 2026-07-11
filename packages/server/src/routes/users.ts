import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const usersRouter = Router();

usersRouter.patch('/me', requireAuth, (req: AuthRequest, res) => {
  const { display_name, avatar } = req.body as { display_name?: string | null; avatar?: string | null };

  if (display_name !== undefined) {
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(display_name, req.userId);
  }
  if (avatar !== undefined) {
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.userId);
  }

  const row = db.prepare(
    'SELECT id, username, email, avatar, status, created_at, display_name FROM users WHERE id = ?'
  ).get(req.userId) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: row.id,
    username: row.username,
    email: row.email,
    avatar: row.avatar,
    status: row.status,
    created_at: row.created_at,
    display_name: row.display_name,
  });
});
