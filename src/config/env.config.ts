import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the project root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Helper to ensure a required environment variable exists
 * @throws Error if the variable is missing or empty
 */
const required = (key: string): string => {
  const val = process.env[key];
  if (!val) {
    throw new Error(`CRITICAL CONFIG ERROR: Missing required environment variable: ${key}`);
  }
  return val;
};

export const config = {
  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  superadmin: {
    email: process.env.SUPERADMIN_EMAIL || 'admin@alltectamil.com',
    password: process.env.SUPERADMIN_PASSWORD || 'Admin@123',
  },
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000').split(','),
  },
  database: {
    host: required('DB_HOST'),
    port: parseInt(required('DB_PORT'), 10),
    name: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    ssl: String(process.env.DB_SSL).trim().toLowerCase() === 'true',
  },
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiry: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  mail: {
    host: required('MAIL_HOST'),
    port: parseInt(required('MAIL_PORT'), 10),
    user: required('MAIL_USER'),
    pass: required('MAIL_PASS'),
    from: required('MAIL_FROM'),
    adminAlertEmail: process.env.ERROR_NOTIFICATION_EMAIL || required('MAIL_FROM'),
  },
  github: {
    token: required('GITHUB_TOKEN'),
    owner: required('GITHUB_OWNER'),
    repo: required('GITHUB_REPO'),
    branch: process.env.GITHUB_BRANCH || 'main',
  },
  jsdelivr: {
    base: required('JSDELIVR_BASE'),
  },
  rateLimits: {
    global: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    auth: {
      windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10),
      max: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '10', 10),
    },
  },
  uploads: {
    maxSizeBytes: parseInt(process.env.MAX_IMAGE_SIZE_BYTES || '5242880', 10),
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp,image/gif').split(','),
  },
  cron: {
    analyticsSchedule: process.env.CRON_ANALYTICS_SCHEDULE || '0,30 * * * *',
    dbBackupSchedule: process.env.CRON_DB_BACKUP_SCHEDULE || '0 0 * * 0',
  },
};
