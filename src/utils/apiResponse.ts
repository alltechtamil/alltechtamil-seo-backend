import { Request, Response } from 'express';
import logger from './logger';
import { config } from '../config/env.config';
import AppError from './AppError.util';

/**
 * API Response Utility
 * Enforces a consistent JSON structure for all API responses.
 */
export class ApiResponse {
  /**
   * Sends a standardized success response.
   *
   * @param res - Express Response object
   * @param statusCode - HTTP status code (e.g., 200, 201)
   * @param message - Success message
   * @param data - The payload to send to the client
   * @param meta - Optional metadata (e.g., pagination info)
   */
  static success(
    res: Response,
    statusCode: number,
    message: string,
    data: unknown = null,
    meta: unknown = null
  ): Response {
    return res.status(statusCode).json({
      success: true,
      status_code: statusCode,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Sends a standardized error response.
   *
   * @param res - Express Response object
   * @param statusCode - HTTP status code
   * @param message - Error message
   * @param errors - Optional detailed error object or array
   * @param fileName - Optional file name for debugging
   * @param functionName - Optional function name for debugging
   */
  static error(
    res: Response,
    statusCode: number,
    message: string,
    errors: unknown = null,
    fileName: string = 'N/A',
    functionName: string = 'N/A',
    correlationId: string = 'N/A'
  ): Response {
    // Log errors (400+) for debugging
    if (statusCode >= 400) {
      logger.error(`API Error [${correlationId}]: ${message}`, {
        status_code: statusCode,
        file_name: fileName,
        function_name: functionName,
        errors,
      });
    }

    return res.status(statusCode).json({
      success: false,
      status_code: statusCode,
      message,
      correlation_id: correlationId,
      errors,
      ...(config.server.env !== 'production' && {
        debug_info: {
          file: fileName,
          function: functionName,
        },
      }),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Standardized controller error handler.
   * Extracts status code, message, and details from unknown errors.
   */
  static handleControllerError(
    res: Response,
    req: Request,
    error: unknown,
    fileName: string,
    functionName: string
  ): Response {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const errors = error instanceof AppError ? error.errors : null;

    return this.error(res, statusCode, message, errors, fileName, functionName, req.correlationId || 'N/A');
  }
}
