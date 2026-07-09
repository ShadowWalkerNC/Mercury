/**
 * AES-256-GCM encrypt / decrypt helpers.
 * Used exclusively for TOTP secrets stored in the database.
 *
 * Key: TOTP_SECRET env var, base64-encoded 32-byte random value.
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Stored format: <iv_b64>:<authTag_b64>:<ciphertext_b64>
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey(): Buffer {
  const raw = process.env['TOTP_SECRET'] ?? '';
  if (!raw) throw new Error('TOTP_SECRET env var is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error(`TOTP_SECRET must be 32 bytes when base64-decoded (got ${key.length})`);
  return key;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
}

export function decrypt(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted value format');
  const [ivB64, tagB64, ctB64] = parts as [string, string, string];
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}
