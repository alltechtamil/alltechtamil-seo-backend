import { Request, Response } from 'express';
import { PublicService } from '../services/public.service';
import { ApiResponse } from '../utils/apiResponse';
import { buildPaginationQuery } from '../utils/paginate';
import { AppError } from '../utils/AppError.util';

const FILE_NAME = 'public.controller.ts';

/**
 * Controller handling unauthenticated public endpoints for rendering the frontend.
 * Enforces strict read-only paradigms.
 */
export class PublicController {
  /**
   * GET /api/v1/public/blogs
   * Retrieves paginated published blogs.
   */
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit } = req.query;
      const featuredOnly = req.query.featured === 'true';

      const paginationQuery = buildPaginationQuery(page as string, limit as string);
      const currentPage = parseInt((page as string) || '1', 10);

      const { rows, meta } = await PublicService.getPublishedBlogs(paginationQuery, currentPage, featuredOnly);

      ApiResponse.success(res, 200, 'Published blogs retrieved successfully.', rows, meta);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getAll');
    }
  }

  /**
   * GET /api/v1/public/blogs/:slug
   * Retrieves a full, single published blog by slug for Article rendering.
   */
  public static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params as { slug: string };

      if (!slug) {
        throw new AppError(400, 'BAD_REQUEST', 'Blog slug is required.');
      }

      const blog = await PublicService.getPublishedBlogBySlug(slug);

      ApiResponse.success(res, 200, 'Blog retrieved successfully.', blog);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getBySlug');
    }
  }

  /**
   * GET /api/v1/public/search
   * Full-text searches on title/excerpt. Rate limited globally.
   */
  public static async search(req: Request, res: Response): Promise<void> {
    try {
      const { q, page, limit } = req.query;

      if (!q || typeof q !== 'string' || q.trim() === '') {
        throw new AppError(400, 'BAD_REQUEST', 'A valid search query (q) is required.');
      }

      const paginationQuery = buildPaginationQuery(page as string, limit as string);
      const currentPage = parseInt((page as string) || '1', 10);

      const { rows, meta } = await PublicService.searchBlogs(q.trim(), paginationQuery, currentPage);

      ApiResponse.success(res, 200, 'Search results retrieved successfully.', rows, meta);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'search');
    }
  }

  /**
   * GET /api/v1/public/search/category/:slug
   * Retrieves blogs strictly mapped to a specific Category.
   */
  public static async getByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params as { slug: string };
      const { page, limit } = req.query;

      if (!slug) {
        throw new AppError(400, 'BAD_REQUEST', 'Category slug is required.');
      }

      const paginationQuery = buildPaginationQuery(page as string, limit as string);
      const currentPage = parseInt((page as string) || '1', 10);

      const { rows, meta } = await PublicService.getBlogsByCategory(slug, paginationQuery, currentPage);

      ApiResponse.success(res, 200, 'Category blogs retrieved successfully.', rows, meta);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getByCategory');
    }
  }

  /**
   * GET /api/v1/public/search/tag/:slug
   * Retrieves blogs strictly mapped to a specific Tag.
   */
  public static async getByTag(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params as { slug: string };
      const { page, limit } = req.query;

      if (!slug) {
        throw new AppError(400, 'BAD_REQUEST', 'Tag slug is required.');
      }

      const paginationQuery = buildPaginationQuery(page as string, limit as string);
      const currentPage = parseInt((page as string) || '1', 10);

      const { rows, meta } = await PublicService.getBlogsByTag(slug, paginationQuery, currentPage);

      ApiResponse.success(res, 200, 'Tag blogs retrieved successfully.', rows, meta);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getByTag');
    }
  }
}

export default PublicController;
