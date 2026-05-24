import Joi from 'joi';

/**
 * Joi validation schema for selective bulk deletion of error logs.
 * Enforces that `ids` is a non-empty array of valid UUID strings.
 */
export const deleteBulkErrorLogsSchema = Joi.object({
  ids: Joi.array()
    .items(
      Joi.string()
        .uuid()
        .required()
        .messages({
          'string.base': 'Each ID must be a string.',
          'string.uuid': 'Each ID must be a valid UUIDv4.',
          'any.required': 'ID is required.',
        })
    )
    .min(1)
    .required()
    .messages({
      'array.base': 'ids must be an array of UUIDs.',
      'array.min': 'ids array must contain at least one error log ID.',
      'any.required': 'ids array is required.',
    }),
});

export default { deleteBulkErrorLogsSchema };
