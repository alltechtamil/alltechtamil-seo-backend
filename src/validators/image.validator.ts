import Joi from 'joi';
import { DB_CONSTRAINTS } from '../config/constants';

/**
 * Validation schema for Image upload metadata.
 * Note: The actual binary file payload and mime-type validations are handled natively
 * by the Multer middleware configurations. This schema strictly validates the accompanying
 * textual metadata parsed into req.body during multipart/form-data uploads.
 */
export const uploadImageSchema = Joi.object({
  blog_id: Joi.string().uuid().allow(null, '').optional().messages({
    'string.guid': 'Blog ID must be a valid UUID.',
    'string.base': 'Blog ID must be a string UUID.',
  }),

  alt_text: Joi.string()
    .trim()
    .max(DB_CONSTRAINTS.IMAGE.MAX_ALT_TEXT)
    .allow(null, '')
    .optional()
    .messages({
      'string.base': 'Alt text must be a string.',
      'string.max': `Alt text cannot exceed ${DB_CONSTRAINTS.IMAGE.MAX_ALT_TEXT} characters.`,
    }),
});
