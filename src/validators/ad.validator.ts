import Joi from 'joi';
import { AD_PLACEMENTS, AD_DEVICE_TARGET } from '../config/constants';

/**
 * Validation schema for creating a new advertisement script.
 */
export const createAdSchema = Joi.object({
  name: Joi.string().trim().max(100).required().messages({
    'string.base': 'Name must be a string.',
    'string.empty': 'Name is required.',
    'string.max': 'Name cannot exceed 100 characters.',
    'any.required': 'Name is a mandatory field.',
  }),
  placement: Joi.string()
    .valid(...Object.values(AD_PLACEMENTS))
    .required()
    .messages({
      'any.only': `Placement must be one of: ${Object.values(AD_PLACEMENTS).join(', ')}`,
      'any.required': 'Placement is a mandatory field.',
    }),
  ad_script: Joi.string().trim().required().messages({
    'string.base': 'Ad script must be a string.',
    'string.empty': 'Ad script cannot be empty.',
    'any.required': 'Ad script is a mandatory field.',
  }),
  device_target: Joi.string()
    .valid(...Object.values(AD_DEVICE_TARGET))
    .default(AD_DEVICE_TARGET.ALL)
    .messages({
      'any.only': `Device target must be one of: ${Object.values(AD_DEVICE_TARGET).join(', ')}`,
    }),
  sort_order: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'Sort order must be a number.',
    'number.integer': 'Sort order must be an integer.',
    'number.min': 'Sort order cannot be negative.',
  }),
  is_active: Joi.boolean().default(true),
});

/**
 * Validation schema for updating an existing advertisement script.
 * All fields are structurally identical to creation but optional.
 */
export const updateAdSchema = Joi.object({
  name: Joi.string().trim().max(100).messages({
    'string.base': 'Name must be a string.',
    'string.max': 'Name cannot exceed 100 characters.',
  }),
  placement: Joi.string()
    .valid(...Object.values(AD_PLACEMENTS))
    .messages({
      'any.only': `Placement must be one of: ${Object.values(AD_PLACEMENTS).join(', ')}`,
    }),
  ad_script: Joi.string().trim().messages({
    'string.base': 'Ad script must be a string.',
    'string.empty': 'Ad script cannot be empty.',
  }),
  device_target: Joi.string()
    .valid(...Object.values(AD_DEVICE_TARGET))
    .messages({
      'any.only': `Device target must be one of: ${Object.values(AD_DEVICE_TARGET).join(', ')}`,
    }),
  sort_order: Joi.number().integer().min(0).messages({
    'number.base': 'Sort order must be a number.',
    'number.integer': 'Sort order must be an integer.',
    'number.min': 'Sort order cannot be negative.',
  }),
  is_active: Joi.boolean(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided to perform an update.',
  });
