import { Router } from 'express';
import { BlogController } from '../controllers/blog.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { createBlogSchema, updateBlogSchema, statusUpdateSchema } from '../validators/blog.validator';
import { idParamSchema } from '../validators/param.validator';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

/**
 * @route   GET /api/v1/blogs
 * @desc    Get all blogs with pagination and optional filters.
 *          Unauthenticated users only receive PUBLISHED blogs.
 * @access  Public (conditionally authenticated)
 */
router.get('/', optionalAuthenticate, BlogController.getAll);

/**
 * @route   GET /api/v1/blogs/slug/:slug
 * @desc    Get a single blog by its URL slug.
 *          Unauthenticated users cannot view DRAFT/ARCHIVED blogs.
 * @access  Public (conditionally authenticated)
 */
router.get('/slug/:slug', optionalAuthenticate, BlogController.getBySlug);

/**
 * @route   GET /api/v1/blogs/:id
 * @desc    Get a specific blog by its UUID. Primarily used in admin panels.
 * @access  Private (superadmin, editor)
 */
router.get(
  '/:id',
  authenticate,
  authorize('superadmin', 'editor'),
  validateRequest({ params: idParamSchema }),
  BlogController.getById
);

/**
 * @route   POST /api/v1/blogs
 * @desc    Create a new blog post.
 * @access  Private (superadmin, editor)
 */
router.post(
  '/',
  authenticate,
  authorize('superadmin', 'editor'),
  validateRequest({ body: createBlogSchema }),
  BlogController.create
);

/**
 * @route   PUT /api/v1/blogs/:id
 * @desc    Update an existing blog post.
 * @access  Private (superadmin, editor)
 */
router.put(
  '/:id',
  authenticate,
  authorize('superadmin', 'editor'),
  validateRequest({ params: idParamSchema, body: updateBlogSchema }),
  BlogController.update
);

/**
 * @route   PATCH /api/v1/blogs/:id/status
 * @desc    Fast-path status update for immediate toggling without full payload.
 * @access  Private (superadmin, editor)
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('superadmin', 'editor'),
  validateRequest({ params: idParamSchema, body: statusUpdateSchema }),
  BlogController.updateStatus
);

/**
 * @route   DELETE /api/v1/blogs/:id
 * @desc    Permanently delete a blog post.
 * @access  Private (superadmin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('superadmin'),
  validateRequest({ params: idParamSchema }),
  BlogController.delete
);

export default router;
