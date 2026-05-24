import { Request, Response } from 'express';
import { TagService } from '../services/tag.service';
import { ApiResponse } from '../utils/apiResponse';

const FILE_NAME = 'tag.controller.ts';

/**
 * Controller handling HTTP requests for Tag operations.
 * Delegates business logic to TagService and enforces standard API responses.
 */
export class TagController {
  /**
   * GET /api/v1/tags
   * Retrieves all tags.
   * Query Param: ?popular=true (Sorts tags by usage count instead of alphabetically)
   */
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const popular = req.query.popular === 'true';

      const tags = await TagService.getAll(popular);

      ApiResponse.success(res, 200, 'Tags retrieved successfully.', tags);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getAll');
    }
  }

  /**
   * GET /api/v1/tags/:slug
   * Retrieves a single tag by its slug. Public endpoint.
   */
  public static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params as { slug: string };

      const tag = await TagService.getBySlug(slug);

      ApiResponse.success(res, 200, 'Tag retrieved successfully.', tag);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getBySlug');
    }
  }

  /**
   * POST /api/v1/tags
   * Creates a new tag.
   * Protected route (Admin/Editor only).
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;

      const tag = await TagService.create(data);

      ApiResponse.success(res, 201, 'Tag created successfully.', tag);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'create');
    }
  }

  /**
   * PUT /api/v1/tags/:id
   * Updates an existing tag.
   * Protected route (Admin/Editor only).
   */
  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const data = req.body;

      const tag = await TagService.update(id, data);

      ApiResponse.success(res, 200, 'Tag updated successfully.', tag);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'update');
    }
  }

  /**
   * DELETE /api/v1/tags/:id
   * Deletes a tag permanently.
   * Protected route (Superadmin only).
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      await TagService.delete(id);

      ApiResponse.success(res, 200, 'Tag deleted successfully.');
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'delete');
    }
  }
}

export default TagController;
