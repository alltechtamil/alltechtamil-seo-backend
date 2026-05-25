import { Request, Response } from 'express';
import { config } from '../config/env.config';
import { COOKIE_EXPIRY } from '../config/constants';
import AuthService from '../services/auth.service';
import User from '../models/User';
import { ApiResponse } from '../utils/apiResponse';
import { NotFoundError, UnauthorizedError } from '../utils/AppError.util';

const FILE_NAME = 'auth.controller.ts';

// ─── Cookie configuration ──────────────────────────────────────────────────────

/** Name of the HttpOnly cookie holding the raw refresh token. */
const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * Returns the standard cookie options used for the refresh token cookie.
 * secure flag is only set in production — allows dev testing over plain HTTP.
 */
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.server.env === 'production',
  sameSite: config.server.env === 'production' ? 'none' as const : 'strict' as const,
  maxAge: COOKIE_EXPIRY.REFRESH_TOKEN_MS,
  path: '/', // Changed to '/' so Next.js frontend proxy can read it on /admin navigations
});

/**
 * Options used when clearing the refresh cookie on logout.
 * Must match the original set options (path, domain) for browsers to honour the clear.
 */
const clearCookieOptions = () => ({
  httpOnly: true,
  secure: config.server.env === 'production',
  sameSite: config.server.env === 'production' ? 'none' as const : 'strict' as const,
  path: '/',
});

// ─── AuthController ────────────────────────────────────────────────────────────

export class AuthController {
  /**
   * POST /api/v1/auth/login
   *
   * Validates credentials via AuthService, sets HttpOnly refresh token cookie,
   * and returns the short-lived access token in the response body.
   *
   * Request body: { email: string, password: string }  (validated by Joi middleware)
   * Response:     { accessToken, user }
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      const { accessToken, rawRefreshToken, user } = await AuthService.login(email, password, ip, userAgent);

      // Set the raw refresh token as an HttpOnly cookie — never exposed in response body
      res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, refreshCookieOptions());

      ApiResponse.success(res, 200, 'Login successful.', { accessToken, user });
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'login');
    }
  }

  /**
   * POST /api/v1/auth/logout
   *
   * Reads the refresh token cookie, delegates revocation to AuthService,
   * and clears the cookie regardless of whether the token was found.
   *
   * Response: 200 with empty data (idempotent — safe to call multiple times)
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    try {
      const rawToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

      // Always clear the cookie first — even if the token is already gone
      res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions());

      if (rawToken) {
        // Delegate DB row deletion to service (idempotent — no throw if not found)
        await AuthService.logout(rawToken);
      }

      ApiResponse.success(res, 200, 'Logged out successfully.', null);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'logout');
    }
  }

  /**
   * POST /api/v1/auth/refresh
   *
   * Reads the HttpOnly refresh token cookie, rotates the token pair via AuthService,
   * sets the new refresh token cookie, and returns the new access token in the body.
   *
   * Response: { accessToken }
   */
  public static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const rawToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

      if (!rawToken) {
        // No cookie present — session has not been established or was already cleared
        throw new UnauthorizedError('No active session found. Please log in.');
      }

      const { accessToken, newRawRefreshToken } = await AuthService.refresh(rawToken);

      // Replace the existing cookie with the newly rotated refresh token
      res.cookie(REFRESH_COOKIE_NAME, newRawRefreshToken, refreshCookieOptions());

      ApiResponse.success(res, 200, 'Token refreshed successfully.', { accessToken });
    } catch (error) {
      // Clear the invalid cookie to prevent frontend middleware redirect loops
      res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions());
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'refresh');
    }
  }

  /**
   * GET /api/v1/auth/me
   *
   * Returns the authenticated user's current profile from a fresh DB lookup.
   * Depends on the authenticate middleware having already set req.user.
   *
   * Response: { id, name, email, role, avatarUrl, isActive, lastLoginAt, createdAt }
   */
  public static async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        // Should never reach here if authenticate middleware is applied, but guard defensively
        throw new UnauthorizedError('Authentication required.');
      }

      // Fresh DB lookup — ensures any recent suspension or role change is reflected immediately
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'name', 'email', 'role', 'avatarUrl', 'isActive', 'lastLoginAt', 'createdAt'],
      });

      if (!user) {
        throw new NotFoundError('User account not found.');
      }

      ApiResponse.success(res, 200, 'User profile fetched successfully.', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      });
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'me');
    }
  }
}

export default AuthController;
