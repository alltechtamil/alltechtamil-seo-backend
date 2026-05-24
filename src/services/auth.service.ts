import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env.config';
import { COOKIE_EXPIRY } from '../config/constants';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { sequelize } from '../config/database';
import { AppError, UnauthorizedError } from '../utils/AppError.util';
import logger from '../utils/logger';

// ─── Return type interfaces ────────────────────────────────────────────────────

/**
 * Shape returned by login().
 * Controller receives this, sets cookie, and returns accessToken in body.
 */
export interface ILoginResult {
  accessToken: string;
  rawRefreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    lastLoginAt: Date | null;
  };
}

/**
 * Shape returned by refresh().
 * Controller replaces the existing cookie with newRawRefreshToken.
 */
export interface IRefreshResult {
  accessToken: string;
  newRawRefreshToken: string;
}

// ─── Private helpers ───────────────────────────────────────────────────────────

/**
 * Derives a SHA-256 hex digest from a raw token string.
 * This is the value stored in the refresh_tokens table.
 * @param rawToken - The plaintext token (sent to client in a cookie)
 * @returns 64-character hex digest
 */
const hashToken = (rawToken: string): string => crypto.createHash('sha256').update(rawToken).digest('hex');

/**
 * Signs a short-lived JWT access token.
 * @param userId  - User UUID (subject claim)
 * @param role    - User role for RBAC claims
 * @returns Signed JWT string
 */
const signAccessToken = (userId: string, role: string): string => {
  const payload = { sub: userId, role };
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiry as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt.accessSecret, options);
};

/**
 * Generates a cryptographically secure random token and its SHA-256 hash.
 * @returns { rawToken, tokenHash }
 */
const generateRefreshToken = (): { rawToken: string; tokenHash: string } => {
  const rawToken = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
};

/**
 * Calculates the absolute expiry Date from the refresh token lifetime constant.
 * @returns Date instance exactly REFRESH_TOKEN_MS milliseconds in the future
 */
const refreshTokenExpiresAt = (): Date => new Date(Date.now() + COOKIE_EXPIRY.REFRESH_TOKEN_MS);

// ─── AuthService ───────────────────────────────────────────────────────────────

export class AuthService {
  /**
   * Authenticates a user and issues an access token + raw refresh token.
   *
   * Flow:
   *  1. Lookup user by email (case-insensitive, already lowercase from Joi)
   *  2. Validate password using User.validatePassword() bcrypt comparison
   *  3. Enforce is_active gate
   *  4. Sign short-lived JWT access token
   *  5. Generate raw refresh token + SHA-256 hash
   *  6. Persist hashed refresh token to refresh_tokens table with expires_at
   *  7. Update user.last_login_at without triggering beforeUpdate password rehash
   *  8. Return { accessToken, rawRefreshToken, user }
   *
   * @param email     - Lowercased, validated email from Joi schema
   * @param password  - Raw password from request body
   * @param ip        - Client IP address (from req.ip, stored for audit)
   * @param userAgent - Client User-Agent header (stored for audit)
   */
  public static async login(email: string, password: string, ip?: string, userAgent?: string): Promise<ILoginResult> {
    try {
      // 1. Find user — use generic error to prevent email enumeration attacks
      const user = await User.findOne({ where: { email } });
      if (!user) {
        logger.warn(`Login attempt for non-existent email: ${email}`);
        throw new UnauthorizedError('Invalid email or password.');
      }

      // 2. Validate password — User model exposes validatePassword() using bcrypt.compare
      const isPasswordValid = await user.validatePassword(password);
      if (!isPasswordValid) {
        logger.warn(`Invalid password attempt for user: ${user.id}`);
        throw new UnauthorizedError('Invalid email or password.');
      }

      // 3. Enforce account active gate after password check (intentional order — prevents timing oracle)
      if (!user.isActive) {
        logger.warn(`Suspended account login attempt: ${user.id}`);
        throw new UnauthorizedError('Your account has been suspended. Please contact support.');
      }

      // 4. Sign JWT access token
      const accessToken = signAccessToken(user.id, user.role);

      // 5. Generate raw refresh token + hash
      const { rawToken: rawRefreshToken, tokenHash } = generateRefreshToken();
      const expiresAt = refreshTokenExpiresAt();

      // 6. Persist hashed refresh token
      await RefreshToken.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: ip ?? null,
        userAgent: userAgent ?? null,
      });

      // 7. Update last_login_at — explicitly limit fields to avoid triggering beforeUpdate password rehash
      user.lastLoginAt = new Date();
      await user.save({ fields: ['lastLoginAt'] });

      logger.info(`User logged in successfully: ${user.id}`);

      return {
        accessToken,
        rawRefreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          lastLoginAt: user.lastLoginAt,
        },
      };
    } catch (error) {
      // Only log unexpected failures — intentional business rule throws (UnauthorizedError) are
      // already logged individually above and do not need a second error-level log entry.
      if (!(error instanceof AppError)) {
        logger.error('[AuthService.login] Unexpected error during login', {
          message: (error as Error).message,
          stack: (error as Error).stack,
        });
      }
      throw error;
    }
  }

  /**
   * Validates a raw refresh token and rotates it, issuing a new access token.
   *
   * Flow:
   *  1. SHA-256 hash the incoming raw token
   *  2. Lookup matching row in refresh_tokens by token_hash
   *  3. Validate expires_at — if expired, delete stale row and throw
   *  4. Load associated user, verify is_active
   *  5. Sign new access token
   *  6. Rotate refresh token atomically (delete old, insert new) in a transaction
   *  7. Return { accessToken, newRawRefreshToken }
   *
   * @param rawToken - The plaintext refresh token from the client cookie
   */
  public static async refresh(rawToken: string): Promise<IRefreshResult> {
    try {
      // 1. Hash the incoming token to locate it in DB
      const tokenHash = hashToken(rawToken);

      // 2. Find matching refresh token row
      const tokenRow = await RefreshToken.findOne({ where: { tokenHash } });
      if (!tokenRow) {
        throw new UnauthorizedError('Invalid or expired session. Please log in again.');
      }

      // 3. Check expiry — delete stale row to keep table clean, then throw
      if (tokenRow.expiresAt < new Date()) {
        await tokenRow.destroy();
        logger.warn(`Expired refresh token used, row deleted: ${tokenRow.id}`);
        throw new UnauthorizedError('Session expired. Please log in again.');
      }

      // 4. Load user and verify account is still active
      const user = await User.findByPk(tokenRow.userId);
      if (!user) {
        // Orphaned token — should never happen due to ON DELETE CASCADE, but guard defensively
        await tokenRow.destroy();
        throw new UnauthorizedError('Invalid session. Please log in again.');
      }

      if (!user.isActive) {
        logger.warn(`Refresh attempt on suspended account: ${user.id}`);
        throw new UnauthorizedError('Your account has been suspended. Please contact support.');
      }

      // 5. Sign new access token
      const newAccessToken = signAccessToken(user.id, user.role);

      // 6. Rotate refresh token atomically — delete old, insert new inside a transaction
      const { rawToken: newRawRefreshToken, tokenHash: newTokenHash } = generateRefreshToken();
      const newExpiresAt = refreshTokenExpiresAt();

      await sequelize.transaction(async (t) => {
        await tokenRow.destroy({ transaction: t });
        await RefreshToken.create(
          {
            userId: user.id,
            tokenHash: newTokenHash,
            expiresAt: newExpiresAt,
            ipAddress: tokenRow.ipAddress,
            userAgent: tokenRow.userAgent,
          },
          { transaction: t }
        );
      });

      logger.info(`Refresh token rotated for user: ${user.id}`);

      return {
        accessToken: newAccessToken,
        newRawRefreshToken,
      };
    } catch (error) {
      if (!(error instanceof AppError)) {
        logger.error('[AuthService.refresh] Unexpected error during token refresh', {
          message: (error as Error).message,
          stack: (error as Error).stack,
        });
      }
      throw error;
    }
  }

  /**
   * Invalidates a refresh token by deleting its DB row.
   * Idempotent — if the token is not found, the operation silently succeeds.
   * This prevents logout from leaking whether a token ever existed.
   *
   * @param rawToken - The plaintext refresh token from the client cookie
   */
  public static async logout(rawToken: string): Promise<void> {
    try {
      const tokenHash = hashToken(rawToken);

      const deleted = await RefreshToken.destroy({ where: { tokenHash } });

      if (deleted > 0) {
        logger.info(`Refresh token revoked (logout). Rows deleted: ${deleted}`);
      } else {
        // Token already gone — not an error; log as warn for observability
        logger.warn(`Logout attempted with unrecognised token hash — already revoked or never existed.`);
      }
    } catch (error) {
      if (!(error instanceof AppError)) {
        logger.error('[AuthService.logout] Unexpected error during logout', {
          message: (error as Error).message,
          stack: (error as Error).stack,
        });
      }
      throw error;
    }
  }
}

export default AuthService;
