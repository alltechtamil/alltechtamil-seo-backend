import winston from 'winston';
import path from 'path';
import { config } from '../config/env.config';

/**
 * Winston Logger Configuration
 * Defines custom levels, colors, and formatting for the AllTechTamil Blogger Backend.
 */

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Define custom colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell Winston to use these colors
winston.addColors(colors);

// Custom format for console output (Human readable)
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  // Remove service from meta as it's redundant in console
  const rest = { ...meta } as Record<string, unknown>;
  delete rest.service;

  let metaStr = '';
  if (Object.keys(rest).length) {
    const json = JSON.stringify(rest);
    metaStr = ` | ${json}`;
  }
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

const logDir = path.join(__dirname, '../../logs');
const getLogLevel = (): string => {
  return config.server.env === 'development' ? 'debug' : 'info';
};

export const logger = winston.createLogger({
  level: getLogLevel(),
  levels: winston.config.npm.levels, // Use standard NPM levels (error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6)
  format: combine(
    timestamp({
      format: () =>
        new Date().toLocaleString('en-GB', {
          timeZone: 'Asia/Kolkata', // Localized to Indian Standard Time (IST)
          hour12: true,
        }),
    }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'AllTechTamil Blogger API' },
  transports: [
    // 1. Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB limit
      maxFiles: 5,
    }),
    // 2. Write all logs to 'combined.log'
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB limit
      maxFiles: 5,
    }),
  ],
});

/**
 * Enable console logging in all environments
 * Colorizes logs in development, and keeps them clean/raw in production
 */
logger.add(
  new winston.transports.Console({
    format: config.server.env === 'development' ? combine(colorize({ all: true }), consoleFormat) : consoleFormat,
  })
);

/**
 * Stream hook for morgan HTTP requests logging
 */
export const stream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

export default logger;
