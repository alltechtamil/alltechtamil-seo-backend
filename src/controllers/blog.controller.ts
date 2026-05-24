import { Request, Response } from 'express';
import { BlogService, IBlogFilters, IBlogPayload } from '../services/blog.service';
import { ApiResponse } from '../utils/apiResponse';
import { buildPaginationQuery } from '../utils/paginate';
import { BlogStatus } from '../types/enums';
import { triggerFrontendRevalidation } from '../utils/revalidate';

const FILE_NAME = 'blog.controller.ts';

export class BlogController {
  /**
   * GET /api/v1/blogs
   * Retrieves a paginated list of blogs with optional filtering.
   */
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, status, categoryId, authorId, isFeatured } = req.query;

      const paginationQuery = buildPaginationQuery(page as string, limit as string);
      const currentPage = Math.max(1, parseInt(String(page ?? 1), 10) || 1);

      const filters: IBlogFilters = {};

      if (status) filters.status = status as BlogStatus;
      if (categoryId) filters.categoryId = categoryId as string;
      if (authorId) filters.authorId = authorId as string;
      if (isFeatured !== undefined) {
        filters.isFeatured = isFeatured === 'true';
      }

      // If user is NOT an admin/editor, they should arguably only see PUBLISHED blogs.
      // Assuming authorization middleware handles roles before reaching the controller,
      // but enforcing base safety here for public endpoints is standard practice.
      if (!req.user || !['superadmin', 'editor'].includes(req.user.role)) {
        filters.status = BlogStatus.PUBLISHED; // Force public requests to only see published
      }

      const { rows, meta } = await BlogService.getAll(filters, paginationQuery, currentPage);

      ApiResponse.success(res, 200, 'Blogs retrieved successfully.', rows, meta);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getAll');
    }
  }

  /**
   * GET /api/v1/blogs/:id
   * Retrieves a specific blog by its UUID. Admin-facing typically.
   */
  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      const blog = await BlogService.getById(id);

      ApiResponse.success(res, 200, 'Blog retrieved successfully.', blog);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getById');
    }
  }

  /**
   * GET /api/v1/blogs/slug/:slug
   * Retrieves a specific blog by its URL-friendly slug. Public-facing.
   */
  public static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params as { slug: string };

      const blog = await BlogService.getBySlug(slug);

      // Prevent non-admins from viewing DRAFT or ARCHIVED blogs via slug bypassing
      if (blog.status !== BlogStatus.PUBLISHED) {
        if (!req.user || !['superadmin', 'editor'].includes(req.user.role)) {
          // Send 404 to obscure the existence of unpublished blogs from public
          ApiResponse.error(res, 404, `Blog with slug '${slug}' not found.`);
          return;
        }
      }

      ApiResponse.success(res, 200, 'Blog retrieved successfully.', blog);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getBySlug');
    }
  }

  /**
   * POST /api/v1/blogs
   * Creates a new blog post. (Admin/Editor only)
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const payload: IBlogPayload = req.body;
      const authorId = req.user!.id; // Authenticated route guarantees req.user exists

      const blog = await BlogService.create(payload, authorId);

      // Trigger cache purge asynchronously
      triggerFrontendRevalidation('blog', blog.slug);

      ApiResponse.success(res, 201, 'Blog created successfully.', blog);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'create');
    }
  }

  /**
   * PUT /api/v1/blogs/:id
   * Updates an existing blog post. (Admin/Editor only)
   */
  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const payload: Partial<IBlogPayload> = req.body;

      const blog = await BlogService.update(id, payload);

      // Trigger cache purge asynchronously
      triggerFrontendRevalidation('blog', blog.slug);

      ApiResponse.success(res, 200, 'Blog updated successfully.', blog);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'update');
    }
  }

  /**
   * PATCH /api/v1/blogs/:id/status
   * Fast-path status update for immediate toggling without full payload.
   */
  public static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { status, published_at } = req.body as { status: BlogStatus; published_at?: string };

      const parsedPublishedAt = published_at ? new Date(published_at) : undefined;

      const blog = await BlogService.updateStatus(id, status, parsedPublishedAt);

      // Trigger cache purge asynchronously
      triggerFrontendRevalidation('blog', blog.slug);

      ApiResponse.success(res, 200, `Blog status updated to '${status}'.`, blog);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'updateStatus');
    }
  }

  /**
   * DELETE /api/v1/blogs/:id
   * Permanently deletes a blog post.
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      await BlogService.delete(id);

      ApiResponse.success(res, 200, 'Blog deleted successfully.');
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'delete');
    }
  }
}

export default BlogController;
