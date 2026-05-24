import Joi from 'joi';
import { DB_CONSTRAINTS } from '../config/constants';
import { BlogStatus } from '../types/enums';

/**
 * Validation schema for creating a new Blog Post.
 * Follows DB_CONSTRAINTS.BLOG strict parity.
 */
export const createBlogSchema = Joi.object({
  title: Joi.string()
    .trim()
    .max(DB_CONSTRAINTS.BLOG.MAX_TITLE)
    .required()
    .messages({
      'string.base': 'Title must be a string.',
      'string.empty': 'Title cannot be empty.',
      'string.max': `Title cannot exceed ${DB_CONSTRAINTS.BLOG.MAX_TITLE} characters.`,
      'any.required': 'Title is required.',
    }),

  slug: Joi.string()
    .trim()
    .max(DB_CONSTRAINTS.BLOG.MAX_SLUG)
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional()
    .messages({
      'string.base': 'Slug must be a string.',
      'string.max': `Slug cannot exceed ${DB_CONSTRAINTS.BLOG.MAX_SLUG} characters.`,
      'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens.',
    }),

  excerpt: Joi.string().trim().allow(null, '').optional().messages({
    'string.base': 'Excerpt must be a string.',
  }),

  content_html: Joi.string().required().messages({
    'string.base': 'Content HTML must be a string.',
    'string.empty': 'Content HTML cannot be empty.',
    'any.required': 'Content HTML is required.',
  }),

  category_id: Joi.string().uuid().allow(null).optional().messages({
    'string.guid': 'Category ID must be a valid UUID.',
  }),

  tags: Joi.array()
    .items(Joi.string().trim().max(DB_CONSTRAINTS.TAG.MAX_NAME))
    .optional()
    .messages({
      'array.base': 'Tags must be an array of strings.',
      'string.max': `Tag names cannot exceed ${DB_CONSTRAINTS.TAG.MAX_NAME} characters.`,
    }),

  status: Joi.string()
    .valid(...Object.values(BlogStatus))
    .default(BlogStatus.DRAFT)
    .optional()
    .messages({
      'any.only': 'Status must be either draft or published.',
    }),

  is_featured: Joi.boolean().default(false).optional().messages({
    'boolean.base': 'Is Featured must be a boolean.',
  }),

  published_at: Joi.date().iso().allow(null).optional().messages({
    'date.format': 'Published At must be a valid ISO-8601 date.',
  }),

  seo_title: Joi.string()
    .trim()
    .max(DB_CONSTRAINTS.BLOG.MAX_SEO_TITLE)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': `SEO Title cannot exceed ${DB_CONSTRAINTS.BLOG.MAX_SEO_TITLE} characters.`,
    }),

  seo_description: Joi.string()
    .trim()
    .max(DB_CONSTRAINTS.BLOG.MAX_SEO_DESCRIPTION)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': `SEO Description cannot exceed ${DB_CONSTRAINTS.BLOG.MAX_SEO_DESCRIPTION} characters.`,
    }),

  canonical_url: Joi.string()
    .uri()
    .max(DB_CONSTRAINTS.BLOG.MAX_CANONICAL_URL)
    .allow(null, '')
    .optional()
    .messages({
      'string.uri': 'Canonical URL must be a valid URI.',
      'string.max': `Canonical URL cannot exceed ${DB_CONSTRAINTS.BLOG.MAX_CANONICAL_URL} characters.`,
    }),

  focus_keyword: Joi.string()
    .trim()
    .max(DB_CONSTRAINTS.BLOG.MAX_FOCUS_KEYWORD)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': `Focus Keyword cannot exceed ${DB_CONSTRAINTS.BLOG.MAX_FOCUS_KEYWORD} characters.`,
    }),

  structured_data: Joi.object().allow(null).optional().messages({
    'object.base': 'Structured Data must be a valid JSON object.',
  }),

  og_image_url: Joi.string()
    .uri()
    .max(DB_CONSTRAINTS.BLOG.MAX_OG_IMAGE_URL)
    .allow(null, '')
    .optional()
    .messages({
      'string.uri': 'OG Image URL must be a valid URI.',
      'string.max': `OG Image URL cannot exceed ${DB_CONSTRAINTS.BLOG.MAX_OG_IMAGE_URL} characters.`,
    }),

  og_title: Joi.string()
    .trim()
    .max(DB_CONSTRAINTS.BLOG.MAX_OG_TITLE)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': `OG Title cannot exceed ${DB_CONSTRAINTS.BLOG.MAX_OG_TITLE} characters.`,
    }),

  og_description: Joi.string()
    .trim()
    .max(DB_CONSTRAINTS.BLOG.MAX_OG_DESCRIPTION)
    .allow(null, '')
    .optional()
    .messages({
      'string.max': `OG Description cannot exceed ${DB_CONSTRAINTS.BLOG.MAX_OG_DESCRIPTION} characters.`,
    }),
});

/**
 * Validation schema for updating an existing Blog Post.
 * All fields are optional.
 */
export const updateBlogSchema = createBlogSchema
  .fork(['title', 'content_html'], (schema) => schema.optional())
  .keys({
    // Overwrite the original fields to remove their .default() behaviors during updates
    status: Joi.string()
      .valid(...Object.values(BlogStatus))
      .optional()
      .messages({ 'any.only': 'Status must be either draft or published.' }),
    is_featured: Joi.boolean().optional().messages({ 'boolean.base': 'Is Featured must be a boolean.' }),
  });

/**
 * Validation schema specifically for updating just the status of a blog.
 */
export const statusUpdateSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(BlogStatus))
    .required()
    .messages({
      'any.only': 'Status must be either draft or published.',
      'any.required': 'Status is required.',
    }),
  published_at: Joi.date().iso().allow(null).optional().messages({
    'date.format': 'Published At must be a valid ISO-8601 date.',
  }),
});
