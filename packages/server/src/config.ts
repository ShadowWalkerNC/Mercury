export const PORT = parseInt(process.env['PORT'] ?? '4000', 10);
export const HOST = process.env['HOST'] ?? '0.0.0.0';
export const CORS_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';
export const DB_PATH = process.env['DB_PATH'] ?? './data/mercury.db';
