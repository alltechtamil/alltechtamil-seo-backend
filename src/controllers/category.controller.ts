import { Request, Response } from 'express';
import { CategoryService } from '../services/category.service';
import { ApiResponse } from '../utils/apiResponse';

const FILE_NAME = 'category.controller.ts';

/**
 * Controller handling HTTP requests for Category operations.
 * Delegates business logic to CategoryService and enforces standard API responses.
 */
export class CategoryController {
  /**
   * GET /api/v1/categories
   * Retrieves all categories.
   * Query Param: ?includeInactive=true (Only honored if user is authenticated as superadmin/editor)
   */
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      let includeInactive = false;

      // Safely parse the query param
      const queryParam = req.query.includeInactive === 'true';

      // Only honor includeInactive if the requester is authenticated and has administrative privileges
      if (queryParam && req.user && ['superadmin', 'editor'].includes(req.user.role)) {
        includeInactive = true;
      }

      const categories = await CategoryService.getAll(includeInactive);

      ApiResponse.success(res, 200, 'Categories retrieved successfully.', categories);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getAll');
    }
  }

  /**
   * GET /api/v1/categories/:slug
   * Retrieves a single category by its slug. Public endpoint.
   */
  public static async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params as { slug: string };

      const category = await CategoryService.getBySlug(slug);

      ApiResponse.success(res, 200, 'Category retrieved successfully.', category);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'getBySlug');
    }
  }

  /**
   * POST /api/v1/categories
   * Creates a new category.
   * Protected route (Admin/Editor only).
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;

      const category = await CategoryService.create(data);

      ApiResponse.success(res, 201, 'Category created successfully.', category);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'create');
    }
  }

  /**
   * PUT /api/v1/categories/:id
   * Updates an existing category.
   * Protected route (Admin/Editor only).
   */
  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const data = req.body;

      const category = await CategoryService.update(id, data);

      ApiResponse.success(res, 200, 'Category updated successfully.', category);
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'update');
    }
  }

  /**
   * DELETE /api/v1/categories/:id
   * Deletes a category permanently.
   * Protected route (Superadmin only).
   */
  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      await CategoryService.delete(id);

      ApiResponse.success(res, 200, 'Category deleted successfully.');
    } catch (error) {
      ApiResponse.handleControllerError(res, req, error, FILE_NAME, 'delete');
    }
  }
}

export default CategoryController;
