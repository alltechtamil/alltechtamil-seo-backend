import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { ApiResponse } from '../utils/apiResponse';
import Joi from 'joi';
import { ValidationError } from '../utils/AppError.util';

const FILE_NAME = 'analytics.controller.ts';

export class AnalyticsController {
  /**
   * Tracks a page view from the frontend.
   * This is a lightning-fast, non-blocking endpoint. It fires the service layer asynchronously
   * and immediately returns a 200 OK so the client isn't hanging on DB write speeds.
   */
  public static async trackView(req: Request, res: Response): Promise<void> {
    try {
      // 1. Inline strict validation for the tracking payload
      const schema = Joi.object({
        blogId: Joi.string().uuid().required(),
        readTimeSec: Joi.number().integer().min(0).default(0),
        isBounce: Joi.boolean().default(false),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // 2. Extract network fingerprint data safely
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip') as string;
      const userAgent = req.headers['user-agent'] || 'unknown-ua';
      const referrer = (req.headers.referer || req.headers.referrer || null) as string | undefined;

      // 3. Fire the asynchronous background worker
      AnalyticsService.trackView(value.blogId, ip, userAgent, value.readTimeSec, value.isBounce, referrer);

      // 4. Return immediately to prevent blocking the client main thread
      ApiResponse.success(res, 200, 'View tracked asynchronously.');
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'trackView');
    }
  }

  /**
   * Retrieves high-level analytics overview for the Admin Dashboard.
   */
  public static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await AnalyticsService.getOverview();
      ApiResponse.success(res, 200, 'Analytics overview retrieved successfully.', overview);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getOverview');
    }
  }

  /**
   * Retrieves detailed analytics for a single blog.
   */
  public static async getBlogStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await AnalyticsService.getBlogAnalytics(id as string);
      ApiResponse.success(res, 200, 'Blog analytics retrieved successfully.', stats);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getBlogStats');
    }
  }

  /**
   * Retrieves trending search queries.
   */
  public static async getSearchTrends(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const safeLimit = isNaN(limit) || limit < 1 ? 20 : limit;

      const trends = await AnalyticsService.getSearchTrends(safeLimit);
      ApiResponse.success(res, 200, 'Search trends retrieved successfully.', trends);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getSearchTrends');
    }
  }
}

export default AnalyticsController;
