import { sequelize } from '../config/database';
import { Blog, BlogAnalytics, PageViewLog, SearchLog, Category, User } from '../models';
import { NotFoundError } from '../utils/AppError.util';
import { generateVisitorHash } from '../utils/hashFingerprint';
import logger from '../utils/logger';
import { BlogStatus } from '../types/enums';

export class AnalyticsService {
  /**
   * Non-blocking method to track a page view.
   * Generates a privacy-safe hash and inserts into PageViewLog asynchronously.
   */
  public static trackView(
    blogId: string,
    ip: string,
    userAgent: string,
    readTimeSec: number,
    isBounce: boolean,
    referrer?: string
  ): void {
    setImmediate(async () => {
      try {
        const dateString = new Date().toISOString().split('T')[0];
        const visitorHash = generateVisitorHash(ip, userAgent, blogId, dateString);

        await PageViewLog.create({
          blogId,
          visitorHash,
          readTimeSec: Math.max(0, readTimeSec),
          isBounce,
          referrer,
        });
      } catch (error) {
        logger.error(`AnalyticsService.trackView async execution failed: ${(error as Error).message}`, { blogId });
      }
    });
  }

  /**
   * Retrieves high-level analytics overview for the Admin Dashboard.
   */
  public static async getOverview(): Promise<Record<string, unknown>> {
    try {
      const [totalBlogs, publishedBlogs] = await Promise.all([
        Blog.count(),
        Blog.count({ where: { status: BlogStatus.PUBLISHED } }),
      ]);

      const totalViewsResult = await BlogAnalytics.sum('totalViews');
      const totalViews = totalViewsResult || 0;

      const topBlogs = await BlogAnalytics.findAll({
        order: [['totalViews', 'DESC']],
        limit: 5,
        include: [
          {
            model: Blog,
            attributes: ['id', 'title', 'slug', 'status'],
          },
        ],
      });

      // Raw query for trending tags to ensure exact relational aggregation and performance
      const [trendingTags] = await sequelize.query(`
        SELECT t.id, t.name, t.slug, COALESCE(SUM(ba.total_views), 0) as "totalViews"
        FROM tags t
        JOIN blog_tags bt ON t.id = bt.tag_id
        JOIN blogs b ON b.id = bt.blog_id
        JOIN blog_analytics ba ON ba.blog_id = b.id
        GROUP BY t.id, t.name, t.slug
        ORDER BY "totalViews" DESC
        LIMIT 10
      `);

      const recentSearches = await SearchLog.findAll({
        order: [['searchedAt', 'DESC']],
        limit: 10,
      });

      return {
        counts: {
          totalBlogs,
          publishedBlogs,
          totalViews,
        },
        topBlogs,
        trendingTags,
        recentSearches,
      };
    } catch (error) {
      logger.error(`AnalyticsService.getOverview DB Error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Retrieves detailed analytics for a specific blog.
   */
  public static async getBlogAnalytics(blogId: string): Promise<BlogAnalytics> {
    try {
      const analytics = await BlogAnalytics.findOne({
        where: { blogId },
        include: [
          {
            model: Blog,
            attributes: ['id', 'title', 'status', 'publishedAt'],
            include: [
              { model: User, as: 'author', attributes: ['name'] },
              { model: Category, attributes: ['name'] },
            ],
          },
        ],
      });

      if (!analytics) {
        throw new NotFoundError(`Analytics for blog ID ${blogId} not found.`);
      }

      return analytics;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`AnalyticsService.getBlogAnalytics DB Error: ${(error as Error).message}`, { blogId });
      throw error;
    }
  }

  /**
   * Aggregates common search terms.
   */
  public static async getSearchTrends(limit: number = 20): Promise<unknown[]> {
    try {
      const [trends] = await sequelize.query(
        `
        SELECT query, COUNT(id) as "occurrences", MAX(searched_at) as "lastSearched"
        FROM search_logs
        GROUP BY query
        ORDER BY "occurrences" DESC, "lastSearched" DESC
        LIMIT :limit
      `,
        {
          replacements: { limit },
        }
      );

      return trends as unknown[];
    } catch (error) {
      logger.error(`AnalyticsService.getSearchTrends DB Error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Cron Job Worker Logic.
   * Scans PageViewLogs, aggregates stats natively via SQL, and upserts into BlogAnalytics.
   * This decoupled design ensures reads are lightning fast, offloading write-heavy aggregations.
   */
  public static async aggregateBlogAnalytics(): Promise<{ updatedCount: number }> {
    try {
      // 1. Compute all metrics efficiently inside Postgres
      const [aggregations] = await sequelize.query(`
        SELECT 
          blog_id as "blogId",
          COUNT(id) as "totalViews",
          COUNT(DISTINCT visitor_hash) as "uniqueVisitors",
          COALESCE(AVG(read_time_sec), 0) as "avgReadTimeSec",
          SUM(CASE WHEN is_bounce THEN 1 ELSE 0 END) as "bounceCount",
          MAX(viewed_at) as "lastViewedAt"
        FROM page_view_logs
        GROUP BY blog_id
      `);

      if (!aggregations || aggregations.length === 0) {
        return { updatedCount: 0 };
      }

      interface IRawAggregationRow {
        blogId: string;
        totalViews: string | number;
        uniqueVisitors: string | number;
        avgReadTimeSec: string | number;
        bounceCount: string | number;
        lastViewedAt: string | Date;
      }

      // 2. Transact the upserts iteratively to prevent deadlocks on high concurrency
      await sequelize.transaction(async (t) => {
        for (const row of aggregations as IRawAggregationRow[]) {
          const { blogId, totalViews, uniqueVisitors, avgReadTimeSec, bounceCount, lastViewedAt } = row;

          const existingRecord = await BlogAnalytics.findOne({ where: { blogId }, transaction: t });

          if (existingRecord) {
            await existingRecord.update(
              {
                totalViews: String(totalViews),
                uniqueVisitors: String(uniqueVisitors),
                avgReadTimeSec: Math.round(Number(avgReadTimeSec)),
                bounceCount: String(bounceCount),
                lastViewedAt: new Date(lastViewedAt),
              },
              { transaction: t }
            );
          } else {
            await BlogAnalytics.create(
              {
                blogId,
                totalViews: String(totalViews),
                uniqueVisitors: String(uniqueVisitors),
                avgReadTimeSec: Math.round(Number(avgReadTimeSec)),
                bounceCount: String(bounceCount),
                lastViewedAt: new Date(lastViewedAt),
              },
              { transaction: t }
            );
          }
        }
      });

      return { updatedCount: aggregations.length };
    } catch (error) {
      logger.error(`AnalyticsService.aggregateBlogAnalytics Cron Job Error: ${(error as Error).message}`);
      throw error;
    }
  }
}

export default AnalyticsService;
