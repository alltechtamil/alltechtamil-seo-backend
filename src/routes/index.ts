import { Router, Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import tagRoutes from './tag.routes';
import blogRoutes from './blog.routes';
import imageRoutes from './image.routes';
import publicRoutes from './public.routes';
import analyticsRoutes from './analytics.routes';
import adRoutes from './ad.routes';
import errorLogRoutes from './error-log.routes';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    System operational health status check
 * @access  Public
 */
router.get('/health', (req: Request, res: Response) => {
  if (req) {
    // Reference parameter cleanly to satisfy strict unused parameter and unused expression rules.
  }
  return ApiResponse.success(res, 200, 'AllTechTamil Blogger API Backend operational.', {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount modular v1 admin routes
router.use('/v1/admin/auth', authRoutes);
router.use('/v1/admin/categories', categoryRoutes);
router.use('/v1/admin/tags', tagRoutes);
router.use('/v1/admin/blogs', blogRoutes);
router.use('/v1/admin/images', imageRoutes);
router.use('/v1/admin/analytics', analyticsRoutes);
router.use('/v1/admin/ads', adRoutes);
router.use('/v1/admin/error-logs', errorLogRoutes);

// Mount modular v1 public routes
router.use('/v1/public', publicRoutes);

export default router;
