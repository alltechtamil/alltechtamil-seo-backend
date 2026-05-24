import { UniqueConstraintError, ForeignKeyConstraintError, Op } from 'sequelize';
import { sequelize } from '../config/database';
import Category, { ICategoryCreationAttributes } from '../models/Category';
import { NotFoundError, ConflictError } from '../utils/AppError.util';
import logger from '../utils/logger';
import { slugify } from '../utils/slugify';

export class CategoryService {
  /**
   * Retrieves all categories, ordered by sortOrder ascending.
   *
   * @param includeInactive - If true, fetches both active and inactive categories (Admin view).
   *                          Defaults to false (Public view).
   * @returns Array of Category instances
   */
  public static async getAll(includeInactive: boolean = false): Promise<Category[]> {
    try {
      const whereClause = includeInactive ? {} : { isActive: true };

      return await Category.findAll({
        where: whereClause,
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COUNT(*)::integer
                FROM blogs AS b
                WHERE b.category_id = "Category".id
                AND b.status = 'published'
              )`),
              'blogsCount'
            ]
          ]
        },
        order: [['sortOrder', 'ASC']],
      });
    } catch (error) {
      logger.error(`CategoryService.getAll DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        includeInactive,
      });
      throw error;
    }
  }

  /**
   * Retrieves a single category by its URL-friendly slug.
   * Used for public category archive pages.
   *
   * @param slug - Category slug
   * @returns Category instance
   * @throws NotFoundError if the category does not exist
   */
  public static async getBySlug(slug: string): Promise<Category> {
    try {
      const category = await Category.findOne({ where: { slug } });

      if (!category) {
        throw new NotFoundError(`Category with slug '${slug}' not found.`);
      }

      return category;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`CategoryService.getBySlug DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        slug,
      });
      throw error;
    }
  }

  /**
   * Creates a new category.
   * Performs proactive case-insensitive checks to absolutely prevent creating duplicate names or slugs.
   *
   * @param data - Category creation payload (validated via Joi)
   * @returns The newly created Category instance
   * @throws ConflictError if a category with the same name or slug already exists
   */
  public static async create(data: Partial<ICategoryCreationAttributes>): Promise<Category> {
    try {
      // Proactive case-insensitive check for duplicate name
      if (data.name) {
        const nameExists = await Category.findOne({
          where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), data.name.toLowerCase()),
        });
        if (nameExists) {
          throw new ConflictError('A category with this exact name already exists.');
        }
      }

      // Proactive check for duplicate slug (if explicitly provided by the user)
      if (data.slug) {
        const slugExists = await Category.findOne({
          where: sequelize.where(sequelize.fn('LOWER', sequelize.col('slug')), data.slug.toLowerCase()),
        });
        if (slugExists) {
          throw new ConflictError('A category with this slug already exists.');
        }
      }

      try {
        return await Category.create(data as ICategoryCreationAttributes);
      } catch (innerError) {
        if (innerError instanceof UniqueConstraintError) {
          const field = innerError.errors[0]?.path;
          throw new ConflictError(`A category with this ${field || 'name or slug'} already exists.`);
        }
        throw innerError;
      }
    } catch (error) {
      if (error instanceof ConflictError || error instanceof NotFoundError) throw error;
      logger.error(`CategoryService.create DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        data,
      });
      throw error;
    }
  }

  /**
   * Updates an existing category by its primary UUID.
   * Handles edge cases where the new name or slug might conflict with another category.
   *
   * @param id   - UUID of the category to update
   * @param data - Partial category update payload
   * @returns The updated Category instance
   * @throws NotFoundError if the category does not exist
   * @throws ConflictError if the updated name/slug conflicts with another existing category
   */
  public static async update(id: string, data: Partial<ICategoryCreationAttributes>): Promise<Category> {
    try {
      const category = await Category.findByPk(id);

      if (!category) {
        throw new NotFoundError('Category not found for update.');
      }

      // Auto-compute slug if name changes and slug is not explicitly provided
      if (data.name && data.name !== category.name && !data.slug) {
        data.slug = slugify(data.name);
      }

      // Proactive case-insensitive check for duplicate name
      if (data.name && data.name.toLowerCase() !== category.name.toLowerCase()) {
        const nameExists = await Category.findOne({
          where: {
            [Op.and]: [
              sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), data.name.toLowerCase()),
              { id: { [Op.ne]: id } },
            ],
          },
        });
        if (nameExists) {
          throw new ConflictError('Cannot update: A category with this exact name already exists.');
        }
      }

      // Proactive check for duplicate slug
      if (data.slug && data.slug.toLowerCase() !== category.slug.toLowerCase()) {
        const slugExists = await Category.findOne({
          where: {
            [Op.and]: [
              sequelize.where(sequelize.fn('LOWER', sequelize.col('slug')), data.slug.toLowerCase()),
              { id: { [Op.ne]: id } },
            ],
          },
        });
        if (slugExists) {
          throw new ConflictError('Cannot update: A category with this slug already exists.');
        }
      }

      try {
        // .update() merges data and calls the beforeValidate model hooks
        return await category.update(data);
      } catch (innerError) {
        if (innerError instanceof UniqueConstraintError) {
          const field = innerError.errors[0]?.path;
          throw new ConflictError(`Cannot update: A category with this ${field || 'name or slug'} already exists.`);
        }
        throw innerError;
      }
    } catch (error) {
      if (error instanceof ConflictError || error instanceof NotFoundError) throw error;
      logger.error(`CategoryService.update DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        id,
      });
      throw error;
    }
  }

  /**
   * Permanently deletes a category by its primary UUID.
   * Protects against deleting categories that are currently assigned to blog posts.
   *
   * @param id - UUID of the category to delete
   * @throws NotFoundError if the category does not exist
   * @throws ConflictError if the category is still attached to blog posts
   */
  public static async delete(id: string): Promise<void> {
    try {
      try {
        const deletedCount = await Category.destroy({ where: { id } });

        if (deletedCount === 0) {
          throw new NotFoundError('Category not found for deletion.');
        }
      } catch (innerError) {
        if (innerError instanceof ForeignKeyConstraintError) {
          throw new ConflictError('Cannot delete category: It is currently assigned to one or more blog posts.');
        }
        throw innerError;
      }
    } catch (error) {
      if (error instanceof ConflictError || error instanceof NotFoundError) throw error;
      logger.error(`CategoryService.delete DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        id,
      });
      throw error;
    }
  }
}

export default CategoryService;
