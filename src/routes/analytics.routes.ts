import { Router } from 'express';
import AnalyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { ROLES } from '../config/constants';
import { validateRequest } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/param.validator';

const router = Router();

// ============================================================================
// ADMIN DASHBOARD ROUTES
// All routes below require valid JWT and either SUPERADMIN or EDITOR role.
// ============================================================================
router.use(authenticate, authorize(ROLES.SUPERADMIN, ROLES.EDITOR));

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get macro system analytics (total views, trending tags, etc)
 * @access  Private (Admin/Editor)
 */
router.get('/overview', AnalyticsController.getOverview);

/**
 * @route   GET /api/v1/analytics/search-trends
 * @desc    Get top trending search queries from the SearchLog
 * @access  Private (Admin/Editor)
 */
router.get('/search-trends', AnalyticsController.getSearchTrends);

/**
 * @route   GET /api/v1/analytics/blogs/:id
 * @desc    Get detailed analytics for a specific blog post
 * @access  Private (Admin/Editor)
 */
router.get('/blogs/:id', validateRequest({ params: idParamSchema }), AnalyticsController.getBlogStats);

export default router;
