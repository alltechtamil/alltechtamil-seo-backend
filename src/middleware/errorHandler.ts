import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import {
  ValidationError as SequelizeValidationError,
  UniqueConstraintError as SequelizeUniqueConstraintError,
} from 'sequelize';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { MulterError } from 'multer';

import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../utils/AppError.util';
import { logger } from '../utils/logger';
import { config } from '../config/env.config';
import { ErrorSeverity, ErrorType } from '../types/enums';
import { ERROR_SEVERITY, ERROR_TYPE, ErrorSeverityType, ErrorTypeType } from '../config/constants';

import type { IErrorLogCreationAttributes } from '../models/ErrorLog';
import ErrorLog from '../models/ErrorLog';

/**
 * Safely persists critical system error records to the database (ErrorLog table).
 * Uses dynamic import to avoid circular dependencies with the global error handler.
 */
const persistErrorLog = async (logData: IErrorLogCreationAttributes): Promise<void> => {
  try {
    logger.info(
      `[Database Logging] Preparing to persist error log: ${logData.errorMessage} [Type: ${logData.errorType}]`
    );
    await ErrorLog.create(logData);
  } catch (dbError) {
    logger.warn('Failed to persist error log to database.', dbError);
  }
};

/**
 * Triggers nodemailer notifications for high-priority operational exceptions.
 * Guarded in try-catch to ensure Phase 1 compilation remains stable before Phase 3 services are created.
 */
const triggerAdminAlert = async (errorMessage: string, severity: string): Promise<void> => {
  try {
    logger.info(`[Alerting System] High-priority alert triggered. Severity: ${severity} | Message: ${errorMessage}`);
    const { sendAdminAlertEmail } = await import('../services/email.service.js');
    await sendAdminAlertEmail(errorMessage, severity);
  } catch (emailError) {
    logger.warn('Failed to dispatch admin critical email alert.', emailError);
  }
};

/**
 * Global Express Error Handler Middleware
 * Intercepts all operational and runtime exceptions, maps them to standard HTTP protocols,
 * and formats clean, non-leaking API contracts for customers.
 */
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Express ErrorRequestHandler signature requires exactly 4 arguments to trigger error capture.
  // Reference _next dynamically to satisfy both TS noUnusedParameters and ESLint no-unused-expressions.
  if (typeof _next === 'function') {
    // No-op
  }

  const correlationId = req.correlationId || 'N/A';
  const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal Server Error';
  let errorsPayload: unknown = null;
  let severity: ErrorSeverityType = ERROR_SEVERITY.MEDIUM;
  let errorType: ErrorTypeType = ERROR_TYPE.SERVER_ERROR;

  let fileName = 'N/A';
  let functionName = 'N/A';

  // 1. Map Known Custom AppError Class
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode;
    message = error.message;
    errorsPayload = error.errors;
    severity = statusCode >= 500 ? ERROR_SEVERITY.HIGH : ERROR_SEVERITY.LOW;
    errorType = statusCode >= 500 ? ERROR_TYPE.SERVER_ERROR : ERROR_TYPE.OTHER;

    // Log AppErrors as Warnings
    logger.warn(`Operational AppError [${correlationId}] [Code: ${errorCode}]: ${message}`, {
      status_code: statusCode,
      correlation_id: correlationId,
      error_code: errorCode,
      file_name: fileName,
      function_name: functionName,
      errors: errorsPayload,
    });
  }
  // 2. Map Sequelize Validation Exceptions
  else if (error instanceof SequelizeValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Validation failed';
    errorsPayload = error.errors.map((err) => ({
      field: err.path,
      message: err.message,
    }));
    severity = ERROR_SEVERITY.LOW;
    errorType = ERROR_TYPE.DATABASE_ERROR;
  }
  // 3. Map Sequelize Unique Constraint Violations
  else if (error instanceof SequelizeUniqueConstraintError) {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = error.errors[0]?.message || 'Resource already exists';
    errorsPayload = error.errors.map((err) => ({
      field: err.path,
      message: err.message,
    }));
    severity = ERROR_SEVERITY.LOW;
    errorType = ERROR_TYPE.DATABASE_ERROR;
  }
  // 4. Map JWT Exceptions
  else if (error instanceof JsonWebTokenError) {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = error instanceof TokenExpiredError ? 'Session token expired' : 'Invalid session token';
    severity = ERROR_SEVERITY.LOW;
    errorType = ERROR_TYPE.OTHER;
  }
  // 5. Map Multer Upload Exceptions
  else if (error instanceof MulterError) {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    errorCode = error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    message = error.message;
    severity = ERROR_SEVERITY.LOW;
    errorType = ERROR_TYPE.OTHER;
  }
  // 6. Map Unhandled System Exceptions
  else {
    const systemError = error instanceof Error ? error : new Error(String(error));
    message = config.server.env === 'production' ? 'Internal Server Error' : systemError.message;
    severity = ERROR_SEVERITY.CRITICAL;
    errorType = ERROR_TYPE.SERVER_ERROR;

    // Resolve system error frame if present
    const stackLines = systemError.stack?.split('\n') || [];
    if (stackLines.length > 1) {
      const match = stackLines[1].match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
      if (match) {
        functionName = match[1].trim();
        fileName = match[2].trim();
      }
    }

    // Log unexpected exceptions with complete stack trace
    logger.error(`Unhandled Exception [${correlationId}]: ${systemError.message}`, {
      correlation_id: correlationId,
      stack: systemError.stack,
      request_url: req.originalUrl,
      request_method: req.method,
      ip_address: ipAddress,
    });
  }

  // Define database persist payload for crucial anomalies
  // Typecast comparison parameters to avoid TS2367 type narrowing checks
  const shouldPersist =
    statusCode === 500 ||
    errorType === ERROR_TYPE.DATABASE_ERROR ||
    (errorType as string) === ERROR_TYPE.THIRD_PARTY_ERROR ||
    (errorType as string) === ERROR_TYPE.RATE_LIMIT_ERROR;

  if (shouldPersist) {
    const logPayload: IErrorLogCreationAttributes = {
      correlationId,
      errorCode,
      errorMessage: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : undefined,
      fileName: fileName !== 'N/A' ? fileName : undefined,
      functionName: functionName !== 'N/A' ? functionName : undefined,
      severity: severity as ErrorSeverity,
      errorType: errorType as ErrorType,
      requestUrl: req.originalUrl,
      requestMethod: req.method,
      ipAddress,
      userId: req.user?.id || undefined,
    };

    // Safely write to ErrorLog table asynchronously
    persistErrorLog(logPayload);
  }

  // Trigger administration alerts asynchronously for high severity errors
  // Typecast comparison parameters to avoid TS2367 type narrowing checks
  const isHighSeverity =
    severity === ERROR_SEVERITY.HIGH ||
    severity === ERROR_SEVERITY.CRITICAL ||
    (severity as string) === ERROR_SEVERITY.FATAL;

  if (isHighSeverity) {
    const alertMessage = error instanceof Error ? error.message : String(error);
    triggerAdminAlert(alertMessage, severity);
  }

  // Send formatted JSON API error response
  ApiResponse.error(res, statusCode, message, errorsPayload, fileName, functionName, correlationId);
};

export default errorHandler;
