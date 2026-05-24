import { UniqueConstraintError, Op } from 'sequelize';
import { sequelize } from '../config/database';
import Tag, { ITagCreationAttributes } from '../models/Tag';
import Blog from '../models/Blog';
import BlogTag from '../models/BlogTag';
import { NotFoundError, ConflictError } from '../utils/AppError.util';
import logger from '../utils/logger';
import { slugify } from '../utils/slugify';

export class TagService {
  /**
   * Retrieves all tags.
   *
   * @param popular - If true, sorts tags by the number of times they are used in blogs (descending).
   *                  Defaults to false (alphabetical sort).
   * @returns Array of Tag instances
   */
  public static async getAll(popular: boolean = false): Promise<Tag[]> {
    try {
      if (popular) {
        return await Tag.findAll({
          attributes: {
            include: [[sequelize.fn('COUNT', sequelize.col('Blogs.id')), 'usageCount']],
          },
          include: [
            {
              model: Blog,
              attributes: [],
              through: { attributes: [] },
            },
          ],
          group: ['Tag.id'],
          order: [
            [sequelize.literal('"usageCount"'), 'DESC'],
            ['name', 'ASC'],
          ],
        });
      }

      return await Tag.findAll({
        order: [['name', 'ASC']],
      });
    } catch (error) {
      logger.error(`TagService.getAll DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        popular,
      });
      throw error;
    }
  }

  /**
   * Retrieves a single tag by its URL-friendly slug.
   *
   * @param slug - Tag slug
   * @returns Tag instance
   * @throws NotFoundError if the tag does not exist
   */
  public static async getBySlug(slug: string): Promise<Tag> {
    try {
      const tag = await Tag.findOne({ where: { slug } });

      if (!tag) {
        throw new NotFoundError(`Tag with slug '${slug}' not found.`);
      }

      return tag;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`TagService.getBySlug DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        slug,
      });
      throw error;
    }
  }

  /**
   * Creates a new tag.
   * Proactive case-insensitive checks to prevent duplicate names or slugs.
   *
   * @param data - Tag creation payload
   * @returns The newly created Tag instance
   */
  public static async create(data: Partial<ITagCreationAttributes>): Promise<Tag> {
    try {
      if (data.name) {
        const nameExists = await Tag.findOne({
          where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), data.name.toLowerCase()),
        });
        if (nameExists) {
          throw new ConflictError('A tag with this exact name already exists.');
        }
      }

      if (data.slug) {
        const slugExists = await Tag.findOne({
          where: sequelize.where(sequelize.fn('LOWER', sequelize.col('slug')), data.slug.toLowerCase()),
        });
        if (slugExists) {
          throw new ConflictError('A tag with this slug already exists.');
        }
      }

      try {
        return await Tag.create(data as ITagCreationAttributes);
      } catch (innerError) {
        if (innerError instanceof UniqueConstraintError) {
          const field = innerError.errors[0]?.path;
          throw new ConflictError(`A tag with this ${field || 'name or slug'} already exists.`);
        }
        throw innerError;
      }
    } catch (error) {
      if (error instanceof ConflictError || error instanceof NotFoundError) throw error;
      logger.error(`TagService.create DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        data,
      });
      throw error;
    }
  }

  /**
   * Updates an existing tag.
   * Handles edge cases where the new name or slug might conflict with another tag.
   *
   * @param id - UUID of the tag
   * @param data - Partial tag payload
   * @returns The updated Tag instance
   */
  public static async update(id: string, data: Partial<ITagCreationAttributes>): Promise<Tag> {
    try {
      const tag = await Tag.findByPk(id);

      if (!tag) {
        throw new NotFoundError('Tag not found for update.');
      }

      // Auto-compute slug if name changes and slug is not explicitly provided
      if (data.name && data.name !== tag.name && !data.slug) {
        data.slug = slugify(data.name);
      }

      if (data.name && data.name.toLowerCase() !== tag.name.toLowerCase()) {
        const nameExists = await Tag.findOne({
          where: {
            [Op.and]: [
              sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), data.name.toLowerCase()),
              { id: { [Op.ne]: id } },
            ],
          },
        });
        if (nameExists) {
          throw new ConflictError('Cannot update: A tag with this exact name already exists.');
        }
      }

      if (data.slug && data.slug.toLowerCase() !== tag.slug.toLowerCase()) {
        const slugExists = await Tag.findOne({
          where: {
            [Op.and]: [
              sequelize.where(sequelize.fn('LOWER', sequelize.col('slug')), data.slug.toLowerCase()),
              { id: { [Op.ne]: id } },
            ],
          },
        });
        if (slugExists) {
          throw new ConflictError('Cannot update: A tag with this slug already exists.');
        }
      }

      try {
        return await tag.update(data);
      } catch (innerError) {
        if (innerError instanceof UniqueConstraintError) {
          const field = innerError.errors[0]?.path;
          throw new ConflictError(`Cannot update: A tag with this ${field || 'name or slug'} already exists.`);
        }
        throw innerError;
      }
    } catch (error) {
      if (error instanceof ConflictError || error instanceof NotFoundError) throw error;
      logger.error(`TagService.update DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        id,
      });
      throw error;
    }
  }

  /**
   * Helper method for Blog creation: Finds a tag by name (case-insensitive) or creates it.
   *
   * @param name - The tag name to find or create
   * @returns Tag instance
   */
  public static async findOrCreate(name: string): Promise<Tag> {
    const cleanName = name.trim();

    try {
      // 1. Try finding it first (case-insensitive)
      const existingTag = await Tag.findOne({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), cleanName.toLowerCase()),
      });

      if (existingTag) {
        return existingTag;
      }

      // 2. If it doesn't exist, create it (slug is auto-generated by model hook)
      try {
        return await Tag.create({ name: cleanName });
      } catch (innerError) {
        // Catch race conditions where another request created it exactly between our find and create
        if (innerError instanceof UniqueConstraintError) {
          const raceTag = await Tag.findOne({
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), cleanName.toLowerCase()),
          });
          if (raceTag) return raceTag;
        }
        throw innerError;
      }
    } catch (error) {
      if (error instanceof ConflictError || error instanceof NotFoundError) throw error;
      logger.error(`TagService.findOrCreate DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        name: cleanName,
      });
      throw error;
    }
  }

  /**
   * Permanently deletes a tag.
   * Will throw if still attached to blogs.
   *
   * @param id - UUID of the tag
   */
  public static async delete(id: string): Promise<void> {
    try {
      const tag = await Tag.findByPk(id);

      if (!tag) {
        throw new NotFoundError('Tag not found for deletion.');
      }

      // Explicitly enforce the business rule: do not delete if attached to blogs.
      // We check this manually because the DB uses CASCADE on the join table.
      const attachedBlogsCount = await BlogTag.count({ where: { tagId: id } });

      if (attachedBlogsCount > 0) {
        throw new ConflictError('Cannot delete tag: It is currently assigned to one or more blog posts.');
      }

      await tag.destroy();
    } catch (error) {
      if (error instanceof ConflictError || error instanceof NotFoundError) throw error;
      logger.error(`TagService.delete DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        id,
      });
      throw error;
    }
  }
}

export default TagService;
