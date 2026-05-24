import { Router } from 'express';
import AnalyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { ROLES } from '../config/constants';

const router = Router();

// ============================================================================
// DEDICATED ADMIN DASHBOARD ROUTES
// All routes require valid JWT and either SUPERADMIN or EDITOR role.
// ============================================================================
router.use(authenticate, authorize(ROLES.SUPERADMIN, ROLES.EDITOR));

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get aggregated stats (counts, top articles, tag performance) for the overview dashboard
 * @access  Private (Admin/Editor)
 */
router.get('/', AnalyticsController.getOverview);

export default router;
