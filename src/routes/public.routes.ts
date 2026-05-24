import { Router } from 'express';
import { PublicController } from '../controllers/public.controller';
import { CategoryController } from '../controllers/category.controller';
import { TagController } from '../controllers/tag.controller';
import { AdController } from '../controllers/ad.controller';
import AnalyticsController from '../controllers/analytics.controller';
import { publicSearchRateLimiter, apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   GET /api/v1/public/blogs
 * @desc    Get all published blogs (Feed)
 * @access  Public
 */
router.get('/blogs', PublicController.getAll);

/**
 * @route   GET /api/v1/public/blogs/:slug
 * @desc    Get full published blog by slug (Article view)
 * @access  Public
 */
router.get('/blogs/:slug', PublicController.getBySlug);

/**
 * @route   GET /api/v1/public/search
 * @desc    Search published blogs via title/excerpt (with global rate limit)
 * @access  Public
 */
router.get('/search', publicSearchRateLimiter, PublicController.search);

/**
 * @route   GET /api/v1/public/search/category/:slug
 * @desc    List published blogs by category slug
 * @access  Public
 */
router.get('/search/category/:slug', PublicController.getByCategory);

/**
 * @route   GET /api/v1/public/search/tag/:slug
 * @desc    List published blogs by tag slug
 * @access  Public
 */
router.get('/search/tag/:slug', PublicController.getByTag);

/**
 * @route   GET /api/v1/public/categories
 * @desc    Get all active categories
 * @access  Public
 */
router.get('/categories', CategoryController.getAll);

/**
 * @route   GET /api/v1/public/categories/:slug
 * @desc    Get a single category by its slug
 * @access  Public
 */
router.get('/categories/:slug', CategoryController.getBySlug);

/**
 * @route   GET /api/v1/public/tags
 * @desc    Get all tags. Supports ?popular=true
 * @access  Public
 */
router.get('/tags', TagController.getAll);

/**
 * @route   GET /api/v1/public/tags/:slug
 * @desc    Get a single tag by its slug
 * @access  Public
 */
router.get('/tags/:slug', TagController.getBySlug);

/**
 * @route   GET /api/v1/public/ads
 * @desc    Fetch active ads for a given placement.
 * @access  Public
 */
router.get('/ads', apiRateLimiter, AdController.getAds);

/**
 * @route   POST /api/v1/public/analytics/track/view
 * @desc    Public endpoint to ingest page view tracking asynchronously
 * @access  Public (Rate Limited)
 */
router.post('/analytics/track/view', apiRateLimiter, AnalyticsController.trackView);

export default router;
