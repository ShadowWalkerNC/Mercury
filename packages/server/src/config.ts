import { resolve } from 'node:path';

export const PORT               = parseInt(process.env['PORT'] ?? '4000', 10);
export const HOST               = process.env['HOST'] ?? '0.0.0.0';
export const CORS_ORIGIN        = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';
export const DB_PATH            = process.env['DB_PATH'] ?? './data/mercury.db';
export const UPLOAD_DIR         = resolve(process.env['UPLOAD_DIR'] ?? './uploads');
export const UPLOAD_MAX_SIZE_MB = parseInt(process.env['UPLOAD_MAX_SIZE_MB'] ?? '25', 10);
