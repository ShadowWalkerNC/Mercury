import { Router } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Request } from 'express';
import { db } from '../db.js';
import { ulid } from '../utils/ulid.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { uploadQueue } from '../utils/queue.js';
import { UPLOAD_DIR, UPLOAD_MAX_SIZE_MB } from '../config.js';

export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);

// ─── Allowed MIME types ────────────────────────────────────────────────────────────
//
// Only permit images, video, audio, PDF, and common document formats.
// Blocks .exe, .sh, .js, and any other executable type.

const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];
const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function isAllowedMime(mime: string): boolean {
  if (ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p))) return true;
  return ALLOWED_MIME_EXACT.has(mime);
}

// ─── Multer configuration ────────────────────────────────────────────────────────
//
// Files are stored with a random UUID filename (preserving the original
// extension) so that two uploads of "photo.jpg" never collide on disk.
// The original filename is kept in the DB for the client to display.

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (isAllowedMime(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: UPLOAD_MAX_SIZE_MB * 1024 * 1024 },
});

// ─── POST /api/v1/upload ──────────────────────────────────────────────────────────
//
// Accepts a single file field named "file".
// The disk write is serialised through uploadQueue so concurrent uploads
// don’t race each other on disk.
// Returns the attachment row + the public URL the client should use.

uploadsRouter.post(
  '/',
  (req, res, next) => {
    uploadQueue.push(() =>
      new Promise<void>((resolve, reject) => {
        upload.single('file')(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      })
    )
    .then(() => next())
    .catch((err: Error) => {
      if (err.message.includes('File too large')) {
        res.status(413).json({ error: `File exceeds ${UPLOAD_MAX_SIZE_MB}MB limit` });
      } else if (err.message.includes('File type not allowed')) {
        res.status(415).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Upload failed' });
      }
    });
  },
  (req: AuthRequest, res) => {
    const file = (req as AuthRequest & { file?: Express.Multer.File }).file;

    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    // Build the public URL — Caddy (or Express static) serves /uploads/*
    const url = `/uploads/${file.filename}`;

    // Persist to attachments table so messages can reference uploaded files
    const id = ulid();
    db.prepare(`
      INSERT INTO attachments (id, message_id, url, filename, size, mime_type)
      VALUES (?, NULL, ?, ?, ?, ?)
    `).run(id, url, file.originalname, file.size, file.mimetype);

    res.status(201).json({
      id,
      url,
      filename: file.originalname,
      size: file.size,
      mime_type: file.mimetype,
    });
  }
);
