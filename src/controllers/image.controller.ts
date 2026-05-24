import { Request, Response } from 'express';
import { ImageService } from '../services/image.service';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../utils/AppError.util';
import { buildPaginationQuery } from '../utils/paginate';

const FILE_NAME = 'image.controller.ts';

/**
 * Controller handling HTTP requests for Image upload and management operations.
 * Relies on the Multer middleware to populate req.file and req.body.
 */
export class ImageController {
  /**
   * POST /api/v1/images/upload
   * Handles multipart/form-data upload, delegates to ImageService, and returns the DB record.
   * Requires authentication (Admin/Editor).
   */
  public static async upload(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError(400, 'MISSING_FILE', 'No image file was provided in the request payload.');
      }

      // Safe extraction since body was validated by Joi
      const blogId: string | null = req.body.blog_id || null;
      const altText: string | null = req.body.alt_text || null;
      const uploaderId: string = req.user?.id || '';

      const imageRecord = await ImageService.processAndUpload(file, blogId, altText, uploaderId);

      ApiResponse.success(res, 201, 'Image processed and uploaded successfully.', imageRecord);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'upload');
    }
  }

  /**
   * GET /api/v1/images/blog/:blogId
   * Retrieves all images linked to a specific blog.
   * Protected route (Admin/Editor).
   */
  public static async getByBlogId(req: Request, res: Response): Promise<void> {
    try {
      const { blogId } = req.params as { blogId: string };

      const images = await ImageService.getByBlogId(blogId);

      ApiResponse.success(res, 200, 'Blog images retrieved successfully.', images);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getByBlogId');
    }
  }

  /**
   * GET /api/v1/images
   * Retrieves all images in a paginated list.
   * Protected route (Admin/Editor).
   */
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit } = req.query;
      const paginationQuery = buildPaginationQuery(page as string, limit as string);
      const currentPage = Math.max(1, parseInt(String(page ?? 1), 10) || 1);

      const { rows, meta } = await ImageService.getAll(paginationQuery, currentPage);

      ApiResponse.success(res, 200, 'Images retrieved successfully.', rows, meta);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getAll');
    }
  }

  /**
   * DELETE /api/v1/images/:id
   * Deletes an image record.
   * Protected route (Admin/Editor).
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      await ImageService.delete(id);

      ApiResponse.success(res, 200, 'Image record deleted successfully.');
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'delete');
    }
  }
}

export default ImageController;
