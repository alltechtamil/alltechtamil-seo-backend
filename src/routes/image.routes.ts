import { Router } from 'express';
import { ImageController } from '../controllers/image.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { uploadSingleImage } from '../middleware/multer.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { uploadImageSchema } from '../validators/image.validator';
import { idParamSchema, blogIdParamSchema } from '../validators/param.validator';

const router = Router();

/**
 * @route   POST /api/v1/images/upload
 * @desc    Process and upload a single image to GitHub, compile CDN url, and save DB record.
 * @access  Private (Superadmin, Editor)
 * @note    Multer middleware must run *before* validation so req.body is fully parsed.
 */
router.post(
  '/upload',
  authenticate,
  authorize('superadmin', 'editor'),
  uploadSingleImage,
  validateRequest({ body: uploadImageSchema }),
  ImageController.upload
);

/**
 * @route   GET /api/v1/images
 * @desc    Retrieve all images in a paginated list.
 * @access  Private (Superadmin, Editor)
 */
router.get(
  '/',
  authenticate,
  authorize('superadmin', 'editor'),
  ImageController.getAll
);

/**
 * @route   GET /api/v1/images/blog/:blogId
 * @desc    Retrieve all images linked to a specific blog id.
 * @access  Private (Superadmin, Editor)
 */
router.get(
  '/blog/:blogId',
  authenticate,
  authorize('superadmin', 'editor'),
  validateRequest({ params: blogIdParamSchema }),
  ImageController.getByBlogId
);

/**
 * @route   DELETE /api/v1/images/:id
 * @desc    Delete an image database record by UUID.
 * @access  Private (Superadmin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('superadmin'),
  validateRequest({ params: idParamSchema }),
  ImageController.delete
);

export default router;
