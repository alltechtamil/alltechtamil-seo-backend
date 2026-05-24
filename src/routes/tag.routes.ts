import { Router } from 'express';
import { TagController } from '../controllers/tag.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { createTagSchema, updateTagSchema } from '../validators/tag.validator';
import { idParamSchema } from '../validators/param.validator';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

/**
 * @route   GET /api/v1/tags
 * @desc    Get all tags. Supports ?popular=true
 * @access  Public
 */
router.get('/', authenticate, authorize('superadmin', 'editor'), TagController.getAll);

/**
 * @route   GET /api/v1/tags/:slug
 * @desc    Get a single tag by its slug
 * @access  Public
 */
router.get('/:slug', authenticate, authorize('superadmin', 'editor'), TagController.getBySlug);

/**
 * @route   POST /api/v1/tags
 * @desc    Create a new tag manually
 * @access  Private (superadmin, editor)
 */
router.post(
  '/',
  authenticate,
  authorize('superadmin', 'editor'),
  validateRequest({ body: createTagSchema }),
  TagController.create
);

/**
 * @route   PUT /api/v1/tags/:id
 * @desc    Update an existing tag
 * @access  Private (superadmin, editor)
 */
router.put(
  '/:id',
  authenticate,
  authorize('superadmin', 'editor'),
  validateRequest({ params: idParamSchema, body: updateTagSchema }),
  TagController.update
);

/**
 * @route   DELETE /api/v1/tags/:id
 * @desc    Permanently delete a tag
 * @access  Private (superadmin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('superadmin'),
  validateRequest({ params: idParamSchema }),
  TagController.delete
);

export default router;
