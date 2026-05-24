import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';
import { idParamSchema } from '../validators/param.validator';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories. Supports ?includeInactive=true (requires superadmin/editor).
 * @access  Public (conditionally authenticated)
 */
router.get('/', authenticate, authorize('superadmin', 'editor'), CategoryController.getAll);

/**
 * @route   GET /api/v1/categories/:slug
 * @desc    Get a single category by its slug
 * @access  Public
 */
router.get('/:slug', authenticate, authorize('superadmin', 'editor'), CategoryController.getBySlug);

/**
 * @route   POST /api/v1/categories
 * @desc    Create a new category
 * @access  Private (superadmin, editor)
 */
router.post(
  '/',
  authenticate,
  authorize('superadmin', 'editor'),
  validateRequest({ body: createCategorySchema }),
  CategoryController.create
);

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Update an existing category
 * @access  Private (superadmin, editor)
 */
router.put(
  '/:id',
  authenticate,
  authorize('superadmin', 'editor'),
  validateRequest({ params: idParamSchema, body: updateCategorySchema }),
  CategoryController.update
);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Permanently delete a category
 * @access  Private (superadmin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('superadmin'),
  validateRequest({ params: idParamSchema }),
  CategoryController.delete
);

export default router;
