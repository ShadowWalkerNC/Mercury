import { Router } from 'express';
import { authenticator } from 'otplib';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { ulid } from '../utils/ulid.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { JWT_SECRET } from '../index.js';

export const totpRouter = Router();
totpRouter.use(requireAuth);

const BCRYPT_COST       = 10;
const BACKUP_CODE_COUNT = 8;
const BACKUP_CODE_LEN   = 8;

function generateBackupCode(): string {
  return randomBytes(6).toString('base64url').toUpperCase().slice(0, BACKUP_CODE_LEN);
}

// POST /api/v1/auth/2fa/setup
// Generates TOTP secret (stored encrypted, totp_enabled stays 0 until verify-setup).
// Returns otpauth:// URI for QR scan + 8 plaintext backup codes (shown once).
totpRouter.post('/setup', (req: AuthRequest, res) => {
  const user = db.prepare('SELECT id, username, email, totp_enabled FROM users WHERE id = ?')
    .get(req.userId) as { id: string; username: string; email: string; totp_enabled: number } | undefined;
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (user.totp_enabled) { res.status(409).json({ error: '2FA is already enabled. Disable it first.' }); return; }

  const secret = authenticator.generateSecret(20);
  db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(encrypt(secret), req.userId);

  db.prepare('DELETE FROM totp_backup_codes WHERE user_id = ?').run(req.userId);
  const plainCodes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateBackupCode();
    plainCodes.push(code);
    db.prepare('INSERT INTO totp_backup_codes (id, user_id, code_hash) VALUES (?, ?, ?)')
      .run(ulid(), req.userId, bcrypt.hashSync(code, BCRYPT_COST));
  }
  res.json({ otpauth_url: authenticator.keyuri(user.email, 'Mercury', secret), backup_codes: plainCodes, secret });
});

// POST /api/v1/auth/2fa/verify-setup
// Confirms enrollment by verifying a live TOTP code, then sets totp_enabled = 1.
totpRouter.post('/verify-setup',
  validateBody({ code: { type: 'string', min: 6, max: 8 } }),
  (req: AuthRequest, res) => {
    const { code } = req.body as { code: string };
    const user = db.prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?')
      .get(req.userId) as { totp_secret: string | null; totp_enabled: number } | undefined;
    if (!user?.totp_secret) { res.status(400).json({ error: 'No pending 2FA setup. Call /setup first.' }); return; }
    if (user.totp_enabled)  { res.status(409).json({ error: '2FA is already enabled' }); return; }
    if (!authenticator.verify({ token: code, secret: decrypt(user.totp_secret) })) {
      res.status(401).json({ error: 'Invalid code' }); return;
    }
    db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(req.userId);
    res.json({ message: '2FA enabled successfully' });
  }
);

// POST /api/v1/auth/2fa/verify
// Second factor after /auth/login returns { totp_required: true }.
// Accepts totp_session JWT (5m TTL) + TOTP code or backup code.
// Issues full access + refresh tokens on success.
totpRouter.post('/verify',
  validateBody({ totp_session: { type: 'string', min: 1, max: 512 }, code: { type: 'string', min: 6, max: 8 } }),
  (req: AuthRequest, res) => {
    const { totp_session, code } = req.body as { totp_session: string; code: string };
    let userId: string;
    try {
      const decoded = jwt.verify(totp_session, JWT_SECRET) as { sub: string; totp: boolean };
      if (!decoded.totp) throw new Error('Not a totp session');
      userId = decoded.sub;
    } catch { res.status(401).json({ error: 'Invalid or expired 2FA session' }); return; }

    const user = db.prepare(
      'SELECT id, username, email, avatar, status, created_at, totp_secret, totp_enabled FROM users WHERE id = ?'
    ).get(userId) as {
      id: string; username: string; email: string; avatar: string | null;
      status: string; created_at: string; totp_secret: string | null; totp_enabled: number;
    } | undefined;
    if (!user || !user.totp_enabled || !user.totp_secret) {
      res.status(401).json({ error: 'Invalid session' }); return;
    }

    const validTotp = authenticator.verify({ token: code, secret: decrypt(user.totp_secret) });
    if (!validTotp) {
      const backupRows = db.prepare(
        'SELECT id, code_hash FROM totp_backup_codes WHERE user_id = ? AND used = 0'
      ).all(userId) as { id: string; code_hash: string }[];
      const matchRow = backupRows.find(r => bcrypt.compareSync(code, r.code_hash));
      if (!matchRow) { res.status(401).json({ error: 'Invalid code' }); return; }
      db.prepare('UPDATE totp_backup_codes SET used = 1 WHERE id = ?').run(matchRow.id);
    }

    const accessToken  = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = ulid();
    const expiresAt    = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)')
      .run(ulid(), userId, refreshToken, expiresAt);
    db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(userId);

    const { totp_secret: _s, totp_enabled: _e, ...safeUser } = user;
    res.json({ user: safeUser, access_token: accessToken, refresh_token: refreshToken, expires_in: 900 });
  }
);

// POST /api/v1/auth/2fa/disable
// Disables 2FA. Requires current TOTP code to confirm intent.
totpRouter.post('/disable',
  validateBody({ code: { type: 'string', min: 6, max: 8 } }),
  (req: AuthRequest, res) => {
    const { code } = req.body as { code: string };
    const user = db.prepare('SELECT totp_secret, totp_enabled FROM users WHERE id = ?')
      .get(req.userId) as { totp_secret: string | null; totp_enabled: number } | undefined;
    if (!user?.totp_enabled || !user.totp_secret) { res.status(400).json({ error: '2FA is not enabled' }); return; }
    if (!authenticator.verify({ token: code, secret: decrypt(user.totp_secret) })) {
      res.status(401).json({ error: 'Invalid code' }); return;
    }
    db.prepare('UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?').run(req.userId);
    db.prepare('DELETE FROM totp_backup_codes WHERE user_id = ?').run(req.userId);
    res.status(204).send();
  }
);
