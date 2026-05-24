import ErrorLog from '../models/ErrorLog';
import User from '../models/User';
import logger from '../utils/logger';
import { IPaginationQuery, IPaginationMeta, buildPaginationMeta } from '../utils/paginate';
import { AppError, NotFoundError } from '../utils/AppError.util';

export class ErrorLogService {
  /**
   * Retrieves a paginated list of all system error logs, ordered by creation date descending.
   * Includes basic attributes of the user who triggered/experienced the error (if associated).
   *
   * @param pagination - Sanitized pagination boundaries (limit, offset)
   * @param page - Target page index (1-indexed)
   */
  public static async getAll(
    pagination: IPaginationQuery,
    page: number
  ): Promise<{ rows: ErrorLog[]; count: number; meta: IPaginationMeta }> {
    try {
      const { rows, count } = await ErrorLog.findAndCountAll({
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            attributes: ['id', 'name', 'email', 'role'],
          },
        ],
      });

      const meta = buildPaginationMeta(count, page, pagination.limit);

      return { rows, count, meta };
    } catch (error) {
      logger.error(`ErrorLogService.getAll DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        pagination,
        page,
      });
      throw error;
    }
  }

  /**
   * Deletes all persisted error logs from the database.
   */
  public static async deleteAll(): Promise<number> {
    try {
      try {
        const deletedCount = await ErrorLog.destroy({
          where: {},
          truncate: false, // Use standard delete to allow hooks / compatibility if needed
        });
        
        logger.warn(`ErrorLogService.deleteAll: Purged all error log records. Count: ${deletedCount}`);
        return deletedCount;
      } catch (innerError) {
        throw innerError;
      }
    } catch (error) {
      logger.error(`ErrorLogService.deleteAll DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Deletes a collection of error logs by their UUIDs.
   *
   * @param ids - Array of error log UUIDs to delete
   */
  public static async deleteBulk(ids: string[]): Promise<number> {
    try {
      if (!ids || ids.length === 0) {
        throw new AppError(400, 'BAD_REQUEST', 'No error log IDs provided for bulk deletion.');
      }

      try {
        const deletedCount = await ErrorLog.destroy({
          where: {
            id: ids,
          },
        });

        if (deletedCount === 0) {
          throw new NotFoundError('No error logs found with the provided IDs.');
        }

        logger.info(`ErrorLogService.deleteBulk: Deleted selective error logs. Target: ${ids.length}, Deleted: ${deletedCount}`);
        return deletedCount;
      } catch (innerError) {
        throw innerError;
      }
    } catch (error) {
      if (error instanceof AppError || error instanceof NotFoundError) throw error;
      logger.error(`ErrorLogService.deleteBulk DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        ids,
      });
      throw error;
    }
  }
}
export default ErrorLogService;
