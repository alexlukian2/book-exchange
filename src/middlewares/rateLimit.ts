import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter — 100 requests per 15 minutes per IP.
 * Protects against brute-force and basic DoS attacks.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/**
 * Strict rate limiter for exchange requests — 10 per 15 minutes.
 * Prevents email bombing through exchange requests.
 */
export const exchangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many exchange requests, please try again later.' },
});

/**
 * Rate limiter for webhook endpoint — 50 per minute.
 * Webhooks come from Clerk servers, but we still limit to prevent abuse.
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many webhook requests.' },
});
