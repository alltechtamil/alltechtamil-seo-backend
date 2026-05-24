import cron from 'node-cron';
import { AnalyticsService } from '../services/analytics.service';
import { config } from '../config/env.config';
import logger from '../utils/logger';

/**
 * Initializes and schedules the Analytics Aggregation Cron Job.
 * Runs on the schedule defined by CRON_ANALYTICS_SCHEDULE env variable (default: every 30 minutes)
 * to batch-process page view logs into optimized BlogAnalytics statistics,
 * offloading heavy write operations from the user request cycle.
 */
export const scheduleAnalyticsAggregator = (): void => {
  const schedule = config.cron.analyticsSchedule;
  cron.schedule(schedule, async () => {
    logger.info('CronJob [AnalyticsAggregator]: Starting batch aggregation...');
    const startTime = Date.now();

    try {
      const { updatedCount } = await AnalyticsService.aggregateBlogAnalytics();
      const duration = Date.now() - startTime;

      logger.info(
        `CronJob [AnalyticsAggregator]: Completed successfully. Updated ${updatedCount} blogs in ${duration}ms.`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`CronJob [AnalyticsAggregator]: Failed after ${duration}ms: ${(error as Error).message}`);
    }
  });

  logger.info(`Cron schedule initialized: AnalyticsAggregator (${schedule})`);
};

export default scheduleAnalyticsAggregator;
