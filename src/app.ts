import express, { Express } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { correlationIdMiddleware, requestLogger } from './middleware/requestLogger';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { notFoundMiddleware } from './middleware/notFound.middleware';
import { corsMiddleware } from './middleware/cors.middleware';
import rootRouter from './routes/index';

const app: Express = express();

// Trust reverse proxy (essential for rate limiting and real IP retrieval under load balancers)
app.set('trust proxy', 1);

// 1. Mount Security Headers
app.use(helmet());

// 2. Configure and Mount CORS Policy
app.use(corsMiddleware);

// 3. Mount Standard Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 4. Mount Custom Tracing and Metric Loggers
app.use(correlationIdMiddleware);
app.use(requestLogger);

// 5. Mount Rate Limiting Profile to Protected Paths
app.use('/api/v1', apiRateLimiter);

// 6. Mount Application Routes
app.use('/api', rootRouter);

// Main Root Route for bare URL visits
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to AllTechTamil Blogger API',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// 7. Route Not Found Fallback Handler (Standard 404 response structure)
app.use(notFoundMiddleware);

// 8. Mount Centralized Exception Handler
app.use(errorHandler);

export default app;
