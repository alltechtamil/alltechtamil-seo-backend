import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { config } from '../config/env.config';
import { IAccessTokenPayload } from '../types/common';
import { UnauthorizedError } from '../utils/AppError.util';
import logger from '../utils/logger';

/**
 * Authenticate Middleware
 *
 * Extracts and verifies the JWT access token from the Authorization header.
 * On success, attaches the decoded payload to req.user for downstream use.
 * On failure, passes an UnauthorizedError to the centralized error handler.
 *
 * Expected header format: Authorization: Bearer <accessToken>
 *
 * Usage: apply before any route handler that requires authentication.
 *   router.get('/me', authenticate, AuthController.me);
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization header missing or malformed. Expected: Bearer <token>');
    }

    const token = authHeader.slice(7);

    if (!token) {
      throw new UnauthorizedError('Access token is missing.');
    }

    const decoded = jwt.verify(token, config.jwt.accessSecret) as IAccessTokenPayload;

    req.user = {
      id: decoded.sub,
      role: decoded.role,
    };

    logger.debug(`[authenticate] Token verified for user: ${decoded.sub} (role: ${decoded.role})`);

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      logger.warn(`[authenticate] Expired access token used. Token expired at: ${error.expiredAt}`);
      return next(new UnauthorizedError('Access token has expired. Please refresh your session.'));
    }

    if (error instanceof JsonWebTokenError) {
      logger.warn(`[authenticate] Invalid access token: ${error.message}`);
      return next(new UnauthorizedError('Invalid access token. Please log in again.'));
    }

    if (error instanceof UnauthorizedError) {
      return next(error);
    }

    logger.error('[authenticate] Unexpected error during token verification', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });

    next(error);
  }
};

/**
 * Optional Authenticate Middleware
 *
 * Attempts to extract and verify the JWT access token.
 * If valid, req.user is populated. If missing or invalid, it simply proceeds silently.
 * Used for endpoints that have different behavior for authenticated vs anonymous users.
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.slice(7);
    if (!token) return next();

    const decoded = jwt.verify(token, config.jwt.accessSecret) as IAccessTokenPayload;
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch {
    // Silently proceed without setting req.user
    next();
  }
};

export default { authenticate, optionalAuthenticate };
