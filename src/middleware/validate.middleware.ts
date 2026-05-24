import { Request, Response, NextFunction } from 'express';
import { Schema, ValidationErrorItem } from 'joi';
import { ApiResponse } from '../utils/apiResponse';

interface ISchemas {
  body?: Schema;
  params?: Schema;
  query?: Schema;
}

/**
 * Request Validation Middleware
 *
 * Validates request body, params, and query against Joi schemas.
 * Injects validated (and potentially transformed/stripped) values back into req.
 */
export const validateRequest = (schemas: ISchemas) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const opts = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    };

    const errors: ValidationErrorItem[] = [];

    const run = (schema: Schema, source: 'body' | 'params' | 'query') => {
      const dataToValidate = req[source] || {};
      const { value, error } = schema.validate(dataToValidate, opts);
      if (error) {
        errors.push(...error.details);
      } else {
        // Use Object.defineProperty to bypass read-only getters (like req.query in Express 5)
        Object.defineProperty(req, source, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    };

    if (schemas.body) run(schemas.body, 'body');
    if (schemas.params) run(schemas.params, 'params');
    if (schemas.query) run(schemas.query, 'query');

    if (errors.length) {
      const formatted = errors.map((err) => ({
        field: Array.isArray(err.path) ? err.path.join('.') : err.path,
        message: err.message.replace(/["]/g, ''),
      }));

      const firstMessage = formatted[0]?.message || 'Validation Error';
      const correlationId = req.correlationId || 'N/A';

      ApiResponse.error(res, 400, firstMessage, formatted, 'validate.middleware.ts', 'validateRequest', correlationId);
      return;
    }

    next();
  };
};

export default validateRequest;
