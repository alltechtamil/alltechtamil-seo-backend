import { sequelize } from '../config/database';
import logger from '../utils/logger';

/**
 * Programmatic Database Synchronizer.
 * Inspects all registered Sequelize models and creates/updates corresponding tables in the database.
 */
const syncDatabase = async (): Promise<void> => {
  try {
    logger.info('🔄 Starting database synchronization...');

    // Sync all models with the database (safe schema migration/creation)
    await sequelize.sync({ alter: true });

    logger.info('✅ Database synchronization completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database synchronization failed:');
    logger.error((error as Error).stack || (error as Error).message);
    process.exit(1);
  }
};

// Initiate sync
syncDatabase();
