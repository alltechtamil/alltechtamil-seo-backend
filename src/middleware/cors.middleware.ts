import cors from 'cors';
import { config } from '../config/env.config';

/**
 * CORS Configuration Middleware
 * Validates origins against environment whitelists and defines headers/methods parameters.
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    if (config.cors.allowedOrigins.indexOf(origin) !== -1 || config.cors.allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
});
