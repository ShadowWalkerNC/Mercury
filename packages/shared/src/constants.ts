// ─── Timing ───────────────────────────────────────────────────────────────────
export const WS_IDENTIFY_TIMEOUT_MS = 5_000;
export const WS_HEARTBEAT_INTERVAL_MS = 30_000;
export const WS_RECONNECT_BASE_MS = 1_000;
export const WS_RECONNECT_MAX_MS = 30_000;
export const TYPING_CLEAR_MS = 3_000;
export const TYPING_DEBOUNCE_MS = 500;

// ─── Limits ───────────────────────────────────────────────────────────────────
export const MESSAGE_MAX_LENGTH = 4_000;
export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 32;
export const PASSWORD_MIN_LENGTH = 8;
export const SPACE_NAME_MAX_LENGTH = 100;
export const CHANNEL_NAME_MAX_LENGTH = 100;
export const MESSAGES_PAGE_SIZE = 50;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;       // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 3600; // 7 days

// ─── Rate limits ──────────────────────────────────────────────────────────────
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 60;
export const LOGIN_RATE_LIMIT_MAX = 10;
