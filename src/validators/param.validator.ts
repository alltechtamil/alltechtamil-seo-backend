import Joi from 'joi';

/**
 * UUID parameter validator for routes with /:id
 */
export const idParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.base': 'ID must be a string.',
    'string.guid': 'ID must be a valid UUID.',
    'any.required': 'ID parameter is required.',
  }),
});

/**
 * UUID parameter validator for routes with /:blog_id
 */
export const blogIdParamSchema = Joi.object({
  blog_id: Joi.string().uuid().required().messages({
    'string.base': 'Blog ID must be a string.',
    'string.guid': 'Blog ID must be a valid UUID.',
    'any.required': 'Blog ID parameter is required.',
  }),
});

export default { idParamSchema, blogIdParamSchema };
