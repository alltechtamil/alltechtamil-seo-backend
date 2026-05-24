import { Sequelize } from 'sequelize-typescript';
import { Options } from 'sequelize';
import { config } from './env.config';
import logger from '../utils/logger';

/**
 * Sequelize configuration for the AllTechTamil Blogger Backend.
 * Centralizes all database connection settings and naming conventions.
 */
const databaseConfig: Options = {
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  host: config.database.host,
  port: config.database.port,
  dialect: 'postgres',
  // Only log SQL queries in development mode
  logging: config.server.env === 'development' ? (msg) => logger.info(`[SEQUELIZE] ${msg}`) : false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: config.database.ssl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
};

// Initialize Sequelize-Typescript instance
export const sequelize = new Sequelize({
  ...databaseConfig,
});

// Import and register models after instantiation to prevent circular dependencies
import '../models/Image';
import '../models/User';
import '../models/RefreshToken';
import '../models/Category';
import '../models/Tag';
import '../models/Blog';
import '../models/BlogTag';
import '../models/BlogAnalytics';
import '../models/PageViewLog';
import '../models/SearchLog';
import '../models/AdUnit';
import '../models/ErrorLog';

/**
 * Connects to the database with retry logic.
 * Useful for handling database startup delays in orchestrated environments.
 */
export const connectDB = async (retries = 5, delay = 5000): Promise<void> => {
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      logger.info('✅ Database connection has been established successfully.');
      return;
    } catch (error) {
      retries -= 1;
      logger.error(`❌ Database connection failed. Retries remaining: ${retries}`);
      logger.error(`Error: ${(error as Error).message}`);

      if (retries === 0) {
        logger.error('CRITICAL: Could not connect to the database after multiple attempts. Exiting...');
        process.exit(1);
      }

      // Wait before next retry
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

export default databaseConfig;
