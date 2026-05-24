import { Request, Response } from 'express';
import { ErrorLogService } from '../services/error-log.service';
import { ApiResponse } from '../utils/apiResponse';
import { buildPaginationQuery } from '../utils/paginate';

const FILE_NAME = 'error-log.controller.ts';

/**
 * Controller handling HTTP requests for ErrorLog operations.
 * Allows administrators to query, paginate, clear, and selective-delete captured exceptions.
 */
export class ErrorLogController {
  /**
   * GET /api/v1/admin/error-logs
   * Retrieves a paginated list of all system error logs.
   * Query params: ?page=1&limit=20
   */
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit } = req.query;
      const paginationQuery = buildPaginationQuery(page as string, limit as string);
      const currentPage = Math.max(1, parseInt(String(page ?? 1), 10) || 1);

      const { rows, meta } = await ErrorLogService.getAll(paginationQuery, currentPage);

      ApiResponse.success(res, 200, 'Error logs retrieved successfully.', rows, meta);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getAll');
    }
  }

  /**
   * DELETE /api/v1/admin/error-logs
   * Purges all persisted error logs from the database.
   */
  public static async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const deletedCount = await ErrorLogService.deleteAll();
      ApiResponse.success(res, 200, 'All error logs successfully cleared from database.', { deletedCount });
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'deleteAll');
    }
  }

  /**
   * POST /api/v1/admin/error-logs/bulk-delete
   * Deletes a specific collection of error logs by UUID list.
   * Body payload format: { ids: ["uuid-1", "uuid-2"] }
   */
  public static async deleteBulk(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body as { ids: string[] };
      const deletedCount = await ErrorLogService.deleteBulk(ids);
      ApiResponse.success(res, 200, 'Selective error logs successfully deleted.', { deletedCount });
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'deleteBulk');
    }
  }
}

export default ErrorLogController;
