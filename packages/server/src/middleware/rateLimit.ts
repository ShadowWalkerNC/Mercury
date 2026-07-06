import type { Request, Response, NextFunction } from 'express';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from '@mercury/shared';

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateMap = new Map<string, RateEntry>();

// Sweep stale entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateMap) {
    if (entry.resetAt < now) rateMap.delete(key);
  }
}, 60_000).unref();

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? '0.0.0.0';
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    next();
    return;
  }

  entry.count += 1;

  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  next();
}
