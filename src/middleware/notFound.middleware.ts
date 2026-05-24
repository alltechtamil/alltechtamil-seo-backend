import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';

/**
 * Route Not Found Middleware
 * Catch-all handler for unmatched API routes.
 */
export const notFoundMiddleware = (req: Request, res: Response): Response => {
  return ApiResponse.error(
    res,
    404,
    `Route ${req.originalUrl} not found`,
    null,
    'notFound.middleware.ts',
    'notFoundMiddleware',
    req.correlationId || 'N/A'
  );
};
