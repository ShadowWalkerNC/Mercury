import type { Response, NextFunction } from 'express';
import { db } from '../db.js';
import type { AuthRequest } from './auth.js';

/**
 * requireAdmin — must be used after requireAuth.
 *
 * Checks users.is_admin = 1 for the authenticated user.
 * Returns 403 if the user is not an admin.
 *
 * Why a separate middleware instead of a role check inside routes:
 *   Admin routes are a separate concern from space roles. is_admin is a
 *   server-level flag, not a per-space role. Keeping it as middleware means
 *   every admin route gets the same consistent check with zero duplication.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const row = db.prepare(
    'SELECT is_admin FROM users WHERE id = ?'
  ).get(req.userId) as { is_admin: number } | undefined;

  if (!row || row.is_admin !== 1) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}
