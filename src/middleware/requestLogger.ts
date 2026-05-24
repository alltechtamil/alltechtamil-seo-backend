import { Request, Response, NextFunction, RequestHandler } from 'express';
import morgan from 'morgan';
import { randomUUID } from 'crypto';
import { stream } from '../utils/logger';
import { config } from '../config/env.config';

// Define custom morgan token for correlation-id
morgan.token('correlation-id', (req: Request): string => {
  return req.correlationId || 'N/A';
});

// Define custom morgan token for client-ip addressing
morgan.token('client-ip', (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
});

// Structured layout format for production outputs (piped to winston)
const productionFormat = ':method :url :status :response-time ms - :client-ip | CorrelationID: :correlation-id';

// Simplified readable format for development consoles
const developmentFormat = 'dev';

/**
 * Correlation ID Middleware
 * Decodes client-provided trace headers or assigns a new cryptographically secure UUID,
 * and sets the response 'X-Correlation-ID' header for clients tracking.
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationHeader = req.headers['x-correlation-id'];
  req.correlationId = typeof correlationHeader === 'string' ? correlationHeader : randomUUID();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
};

/**
 * Request Logging Middleware
 * Dynamic HTTP logging middleware. Uses the Winston stream for JSON logging in production
 * and standard console styling in development.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  if (config.server.env === 'production') {
    return morgan(productionFormat, { stream })(req, res, next);
  }
  return morgan(developmentFormat)(req, res, next);
};
