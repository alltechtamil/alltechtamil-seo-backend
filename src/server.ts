import app from './app';
import { config } from './config/env.config';
import { connectDB, sequelize } from './config/database';
import { imageConfig } from './config/image.config';
import { testMailConnection } from './config/mail.config';
import { scheduleAnalyticsAggregator } from './jobs/analyticsAggregator';
import { scheduleDbBackupJob } from './jobs/dbBackupJob';
import logger from './utils/logger';

/**
 * Bootstrap the AllTechTamil Blogger Backend Server.
 * Sequence: Database retry connect -> Production diagnostics -> HTTP listener boot.
 */
const bootstrap = async (): Promise<void> => {
  try {
    // 1. Establish Database Connection (with built-in retry-backoff logic)
    await connectDB();

    // 1.5. Schedule Background Cron Jobs
    scheduleAnalyticsAggregator();
    scheduleDbBackupJob();

    // 2. Validate Upstream Connections in Production Only on Startup
    if (config.server.env === 'production') {
      logger.info('📦 Running upstream Image Storage Service diagnostic...');
      const imageResult = await imageConfig.testConnection();
      if (imageResult.success) {
        logger.info(`✅ Image Storage Service verified successfully.`);
      } else {
        logger.error(`❌ Image Storage Service diagnostic failed: ${imageResult.message}`);
      }

      logger.info('📧 Running SMTP Mail Server connection diagnostic...');
      await testMailConnection();
    }

    // 3. Initialize and Boot HTTP Server listener
    const server = app.listen(config.server.port, '0.0.0.0', () => {
      logger.info(
        `🚀 AllTechTamil Blogger API Backend Engine running on port ${config.server.port} in [${config.server.env}] mode.`
      );
    });

    // 3. Graceful Shutdown Handler
    const handleShutdown = async (signal: string): Promise<void> => {
      logger.info(`\n⚠️ Received ${signal}. Initiating graceful shutdown...`);

      // Set safety timeout boundary (10 seconds max duration)
      const safetyExitTimeout = setTimeout(() => {
        logger.error('CRITICAL: Graceful shutdown timed out! Hard exiting process.');
        process.exit(1);
      }, 10000);

      // Stop receiving any incoming requests on HTTP socket
      server.close(async (err) => {
        if (err) {
          logger.error(`Error closing HTTP server socket: ${err.message}`);
        } else {
          logger.info('HTTP listener socket closed successfully.');
        }

        try {
          // Close DB connection pools
          await sequelize.close();
          logger.info('Database connection pool terminated successfully.');

          clearTimeout(safetyExitTimeout);
          logger.info('👋 Graceful shutdown sequence successfully completed.');
          process.exit(0);
        } catch (dbErr) {
          logger.error(`Error closing database connection: ${(dbErr as Error).message}`);
          clearTimeout(safetyExitTimeout);
          process.exit(1);
        }
      });
    };

    // Listen to standard POSIX process termination signals
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    logger.error('FATAL: Engine bootstrapping process failed!');
    logger.error((error as Error).stack || (error as Error).message);
    process.exit(1);
  }
};

// Start the engine
bootstrap();
