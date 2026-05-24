import { Router } from 'express';
import { AdController } from '../controllers/ad.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { ROLES } from '../config/constants';
import { apiRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/param.validator';

const router = Router();

// ============================================================================
// ADMIN AD MANAGEMENT ROUTES
// All routes below require a valid JWT and the SUPERADMIN role.
// ============================================================================
router.use(authenticate, authorize(ROLES.SUPERADMIN));

/**
 * @route   GET /api/v1/ads
 * @desc    Fetch all ads (Admin).
 * @access  Private (Superadmin)
 */
router.get('/', apiRateLimiter, AdController.getAds);

/**
 * @route   POST /api/v1/ads
 * @desc    Create a new AdUnit
 * @access  Private (Superadmin)
 */
router.post('/', AdController.create);

/**
 * @route   PATCH /api/v1/ads/:id
 * @desc    Update an existing AdUnit
 * @access  Private (Superadmin)
 */
router.patch('/:id', validateRequest({ params: idParamSchema }), AdController.update);

/**
 * @route   DELETE /api/v1/ads/:id
 * @desc    Permanently delete an AdUnit
 * @access  Private (Superadmin)
 */
router.delete('/:id', validateRequest({ params: idParamSchema }), AdController.delete);

export default router;
