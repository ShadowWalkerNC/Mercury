import { Router } from 'express';
import { db } from '../db.js';
import { ulid } from '../utils/ulid.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { SPACE_NAME_MAX_LENGTH } from '@mercury/shared';
import type { Space } from '@mercury/shared';

export const spacesRouter = Router();
spacesRouter.use(requireAuth);

// ─── GET /api/v1/spaces ────────────────────────────────────────────────────────────
// Returns all spaces the authenticated user is a member of.

spacesRouter.get('/', (req: AuthRequest, res) => {
  const spaces = db.prepare(`
    SELECT s.id, s.name, s.icon, s.owner_id, s.created_at
    FROM spaces s
    INNER JOIN members m ON m.space_id = s.id
    WHERE m.user_id = ?
    ORDER BY s.created_at ASC
  `).all(req.userId) as Space[];

  res.json(spaces);
});

// ─── POST /api/v1/spaces ──────────────────────────────────────────────────────────
// Creates a space and auto-joins the creator as owner.
// Also creates a default #general text channel.

spacesRouter.post(
  '/',
  validateBody({ name: { type: 'string', min: 1, max: SPACE_NAME_MAX_LENGTH } }),
  (req: AuthRequest, res) => {
    const { name } = req.body as { name: string };
    const spaceId = ulid();

    const createSpace = db.transaction(() => {
      db.prepare(`
        INSERT INTO spaces (id, name, owner_id) VALUES (?, ?, ?)
      `).run(spaceId, name.trim(), req.userId);

      // Owner is automatically a member with role 'owner'
      db.prepare(`
        INSERT INTO members (id, space_id, user_id, role) VALUES (?, ?, ?, 'owner')
      `).run(ulid(), spaceId, req.userId);

      // Default #general channel
      db.prepare(`
        INSERT INTO channels (id, space_id, name, type, position) VALUES (?, ?, 'general', 'text', 0)
      `).run(ulid(), spaceId);
    });

    createSpace();

    const space = db.prepare(
      'SELECT id, name, icon, owner_id, created_at FROM spaces WHERE id = ?'
    ).get(spaceId) as Space;

    res.status(201).json(space);
  }
);

// ─── GET /api/v1/spaces/:id ──────────────────────────────────────────────────────
// Returns a single space — only if the user is a member.

spacesRouter.get('/:id', (req: AuthRequest, res) => {
  const space = db.prepare(`
    SELECT s.id, s.name, s.icon, s.owner_id, s.created_at
    FROM spaces s
    INNER JOIN members m ON m.space_id = s.id
    WHERE s.id = ? AND m.user_id = ?
  `).get(req.params['id'], req.userId) as Space | undefined;

  if (!space) {
    res.status(404).json({ error: 'Space not found' });
    return;
  }

  res.json(space);
});
