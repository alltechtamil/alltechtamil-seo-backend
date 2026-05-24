import Joi from 'joi';
import { SECURITY, DB_CONSTRAINTS } from '../config/constants';

/**
 * Joi validation schema for the login endpoint.
 *
 * Rules enforced:
 *  - email   : valid RFC email format, lowercased, trimmed, max DB length, required.
 *  - password : string, min/max length from SECURITY constants, required.
 *              No complexity rules here — that is enforced only at registration.
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(DB_CONSTRAINTS.USER.MAX_EMAIL)
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.base': 'Email must be a string.',
      'string.email': 'Please provide a valid email address.',
      'string.max': `Email must not exceed ${DB_CONSTRAINTS.USER.MAX_EMAIL} characters.`,
      'any.required': 'Email is required.',
    }),

  password: Joi.string()
    .min(SECURITY.MIN_PASSWORD_LENGTH)
    .max(SECURITY.MAX_PASSWORD_LENGTH)
    .required()
    .messages({
      'string.base': 'Password must be a string.',
      'string.min': `Password must be at least ${SECURITY.MIN_PASSWORD_LENGTH} characters.`,
      'string.max': `Password must not exceed ${SECURITY.MAX_PASSWORD_LENGTH} characters.`,
      'any.required': 'Password is required.',
    }),
});

export default { loginSchema };
