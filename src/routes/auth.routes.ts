import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { loginSchema } from '../validators/auth.validator';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/authenticate';

const router = Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user, set HttpOnly refresh cookie, return access token
 * @access  Public
 */
router.post('/login', authRateLimiter, validateRequest({ body: loginSchema }), AuthController.login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Invalidate refresh token and clear HttpOnly cookie
 * @access  Public (no access token required to log out)
 */
router.post('/logout', AuthController.logout);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Exchange valid refresh cookie for new access/refresh tokens
 * @access  Public (relies on HttpOnly cookie, not Authorization header)
 */
router.post('/refresh', authRateLimiter, AuthController.refresh);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get('/me', authenticate, AuthController.me);

export default router;
