import { resolve } from 'node:path';

export const PORT               = parseInt(process.env['PORT'] ?? '4000', 10);
export const HOST               = process.env['HOST'] ?? '0.0.0.0';
export const CORS_ORIGIN        = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';
export const DB_PATH            = process.env['DB_PATH'] ?? './data/mercury.db';
export const UPLOAD_DIR         = resolve(process.env['UPLOAD_DIR'] ?? './uploads');
export const UPLOAD_MAX_SIZE_MB = parseInt(process.env['UPLOAD_MAX_SIZE_MB'] ?? '25', 10);

// LiveKit — required only when voice/video channels are used.
// Server will start without these but /livekit/token will return 503.
export const LIVEKIT_URL        = process.env['LIVEKIT_URL'] ?? '';
export const LIVEKIT_API_KEY    = process.env['LIVEKIT_API_KEY'] ?? '';
export const LIVEKIT_API_SECRET = process.env['LIVEKIT_API_SECRET'] ?? '';
