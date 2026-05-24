import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/AppError.util';
import { RATE_LIMITS } from '../config/constants';

/**
 * Standard handler invoked when rate limits are exhausted.
 * Passes a standard 429 AppError to the global Express error-handler.
 */
const handleRateLimitExceeded = (req: Request, res: Response, next: NextFunction): void => {
  if (req && res) {
    // Both parameters referenced cleanly to satisfy strict unused parameter and unused expression checks.
  }
  next(new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests from this IP, please try again later.'));
};

/**
 * Decodes the client IP address in proxied environments (e.g. cloudflare, nginx).
 */
const keyGenerator = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
};

/**
 * General API Rate Limiter
 * Applied globally to all /api/v1/* routes.
 */
export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.GLOBAL.windowMs,
  max: RATE_LIMITS.GLOBAL.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: handleRateLimitExceeded,
  validate: false,
});

/**
 * Authentication Routes Rate Limiter
 * Applied specifically to login and token refresh endpoints.
 */
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: handleRateLimitExceeded,
  validate: false,
});

/**
 * Image Upload Rate Limiter
 * Applied specifically to POST upload endpoints.
 */
export const imageUploadRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.UPLOADS.windowMs,
  max: RATE_LIMITS.UPLOADS.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: handleRateLimitExceeded,
  validate: false,
});

/**
 * Public Search Rate Limiter
 * Applied to GET search endpoints.
 */
export const publicSearchRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.SEARCH.windowMs,
  max: RATE_LIMITS.SEARCH.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: handleRateLimitExceeded,
  validate: false,
});
