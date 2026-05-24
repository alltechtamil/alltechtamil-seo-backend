import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Blog, User, Category, Tag, Image, BlogAnalytics } from '../models';
import { TagService } from './tag.service';
import { NotFoundError, ConflictError } from '../utils/AppError.util';
import { sanitizeHtml } from '../middleware/sanitizeHtml';
import { slugify } from '../utils/slugify';
import { BlogStatus } from '../types/enums';
import { IPaginationQuery, IPaginationMeta, buildPaginationMeta } from '../utils/paginate';
import logger from '../utils/logger';

export interface IBlogFilters {
  status?: BlogStatus;
  categoryId?: string;
  authorId?: string;
  isFeatured?: boolean;
}

export interface IBlogPayload {
  title?: string;
  slug?: string;
  excerpt?: string;
  content_html?: string;
  category_id?: string;
  status?: BlogStatus;
  is_featured?: boolean;
  published_at?: Date;
  seo_title?: string;
  seo_description?: string;
  canonical_url?: string;
  focus_keyword?: string;
  structured_data?: Record<string, unknown>;
  og_image_url?: string;
  og_title?: string;
  og_description?: string;
  tags?: string[];
}

export class BlogService {
  /**
   * Retrieves a paginated list of blogs matching the given filters.
   * Typically used for Admin Listing.
   */
  public static async getAll(
    filters: IBlogFilters,
    pagination: IPaginationQuery,
    page: number
  ): Promise<{ rows: Blog[]; count: number; meta: IPaginationMeta }> {
    const whereClause: Record<string, unknown> = {};

    if (filters.status) whereClause.status = filters.status;
    if (filters.categoryId) whereClause.categoryId = filters.categoryId;
    if (filters.authorId) whereClause.authorId = filters.authorId;
    if (filters.isFeatured !== undefined) whereClause.isFeatured = filters.isFeatured;

    try {
      const { rows, count } = await Blog.findAndCountAll({
        where: whereClause,
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'email', 'avatarUrl', 'role'], // Explicitly block passwordHash
          },
          { model: Category, attributes: ['id', 'name', 'slug'] },
          { model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'slug'] },
        ],
        distinct: true, // Critical for accurate count when using Many-to-Many Tag joins
      });

      const meta = buildPaginationMeta(count, page, pagination.limit);

      return { rows, count, meta };
    } catch (error) {
      logger.error(`BlogService.getAll DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        filters,
        pagination,
      });
      throw error;
    }
  }

  /**
   * Retrieves a full blog by its UUID, including all deeply nested associations.
   */
  public static async getById(id: string): Promise<Blog> {
    try {
      const blog = await Blog.findByPk(id, {
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'email', 'avatarUrl', 'role'], // Explicitly block passwordHash
          },
          { model: Category },
          { model: Tag, through: { attributes: [] } },
          { model: Image },
          { model: BlogAnalytics },
        ],
      });

      if (!blog) {
        throw new NotFoundError(`Blog with ID '${id}' not found.`);
      }

      return blog;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`BlogService.getById DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        id,
      });
      throw error;
    }
  }

  /**
   * Retrieves a full blog by its URL slug.
   */
  public static async getBySlug(slug: string): Promise<Blog> {
    try {
      const blog = await Blog.findOne({
        where: { slug },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'email', 'avatarUrl', 'role'],
          },
          { model: Category },
          { model: Tag, through: { attributes: [] } },
          { model: Image },
          { model: BlogAnalytics },
        ],
      });

      if (!blog) {
        throw new NotFoundError(`Blog with slug '${slug}' not found.`);
      }

      return blog;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`BlogService.getBySlug DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        slug,
      });
      throw error;
    }
  }

  /**
   * Creates a new Blog Post wrapped in a Database Transaction.
   * Auto-calculates read time, guarantees unique slug, and finds/creates linked tags.
   */
  public static async create(data: IBlogPayload, authorId: string): Promise<Blog> {
    try {
      // 1. Double-layer Sanitization
      const safeHtml = data.content_html ? sanitizeHtml(data.content_html) : '';

      // 2. Proactive Slug Uniqueness Check
      const slugToCheck = data.slug ? data.slug : slugify(data.title || '');
      const existing = await Blog.findOne({ where: { slug: slugToCheck } });

      if (existing) {
        throw new ConflictError(`A blog with the slug '${slugToCheck}' already exists.`);
      }

      // 3. Map to internal DB schema exactly
      const createData: Record<string, unknown> = {
        title: data.title,
        slug: slugToCheck,
        excerpt: data.excerpt,
        contentHtml: safeHtml,
        authorId,
        categoryId: data.category_id,
        status: data.status,
        isFeatured: data.is_featured,
        publishedAt: data.published_at,
        seoTitle: data.seo_title,
        seoDescription: data.seo_description,
        canonicalUrl: data.canonical_url,
        focusKeyword: data.focus_keyword,
        structuredData: data.structured_data,
        ogImageUrl: data.og_image_url,
        ogTitle: data.og_title,
        ogDescription: data.og_description,
      };

      // Clean undefined fields explicitly so Sequelize defaults engage normally
      Object.keys(createData).forEach((key) => createData[key] === undefined && delete createData[key]);

      const transaction = await sequelize.transaction();
      try {
        // 4. Create core Blog record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blog = await Blog.create(createData as any, { transaction });

        // 5. Attach Tags if provided
        if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
          const tagInstances = await Promise.all(data.tags.map((tagName) => TagService.findOrCreate(tagName)));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (blog as any).setTags(tagInstances, { transaction });
        }

        await transaction.commit();

        // Return the complete object including relationships
        return await BlogService.getById(blog.id);
      } catch (txnError) {
        await transaction.rollback();
        throw txnError;
      }
    } catch (error) {
      if (error instanceof ConflictError || error instanceof NotFoundError) throw error;
      logger.error(`BlogService.create DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        title: data.title,
      });
      throw error;
    }
  }

  /**
   * Updates an existing Blog Post.
   * Safely recalculates slugs, uniqueness, and synchronizes the tag join tables.
   */
  public static async update(id: string, data: Partial<IBlogPayload>): Promise<Blog> {
    try {
      const blog = await Blog.findByPk(id);
      if (!blog) {
        throw new NotFoundError('Blog not found for update.');
      }

      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content_html !== undefined) updateData.contentHtml = sanitizeHtml(data.content_html);
      if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
      if (data.category_id !== undefined) updateData.categoryId = data.category_id;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.is_featured !== undefined) updateData.isFeatured = data.is_featured;
      if (data.published_at !== undefined) updateData.publishedAt = data.published_at;
      if (data.seo_title !== undefined) updateData.seoTitle = data.seo_title;
      if (data.seo_description !== undefined) updateData.seoDescription = data.seo_description;
      if (data.canonical_url !== undefined) updateData.canonicalUrl = data.canonical_url;
      if (data.focus_keyword !== undefined) updateData.focusKeyword = data.focus_keyword;
      if (data.structured_data !== undefined) updateData.structuredData = data.structured_data;
      if (data.og_image_url !== undefined) updateData.ogImageUrl = data.og_image_url;
      if (data.og_title !== undefined) updateData.ogTitle = data.og_title;
      if (data.og_description !== undefined) updateData.ogDescription = data.og_description;

      // Strict Slug Mutation Handlers
      if (data.slug) {
        if (data.slug !== blog.slug) {
          const existing = await Blog.findOne({ where: { slug: data.slug, id: { [Op.ne]: id } } });
          if (existing)
            throw new ConflictError('Cannot update: A blog with this manually provided slug already exists.');
          updateData.slug = data.slug;
        }
      } else if (data.title && data.title !== blog.title) {
        // If title changed but NO explicit new slug was provided, auto-compute a new one
        const newSlug = slugify(data.title);
        if (newSlug !== blog.slug) {
          const existing = await Blog.findOne({ where: { slug: newSlug, id: { [Op.ne]: id } } });
          if (existing)
            throw new ConflictError('Cannot update: The auto-generated slug for this new title already exists.');
          updateData.slug = newSlug;
        }
      }

      const transaction = await sequelize.transaction();
      try {
        await blog.update(updateData, { transaction });

        // Synchronize tags
        if (data.tags !== undefined) {
          if (data.tags.length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (blog as any).setTags([], { transaction }); // Clear tags
          } else {
            const tagInstances = await Promise.all(data.tags.map((tagName) => TagService.findOrCreate(tagName)));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (blog as any).setTags(tagInstances, { transaction });
          }
        }

        await transaction.commit();
        return await BlogService.getById(id);
      } catch (txnError) {
        await transaction.rollback();
        throw txnError;
      }
    } catch (error) {
      if (error instanceof ConflictError || error instanceof NotFoundError) throw error;
      logger.error(`BlogService.update DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        id,
      });
      throw error;
    }
  }

  /**
   * Fast-path status update for immediate toggling without full payload.
   */
  public static async updateStatus(id: string, status: BlogStatus, publishedAt?: Date): Promise<Blog> {
    try {
      const blog = await Blog.findByPk(id);
      if (!blog) {
        throw new NotFoundError('Blog not found.');
      }

      blog.status = status;

      if (publishedAt !== undefined) {
        blog.publishedAt = publishedAt;
      } else if (status === BlogStatus.PUBLISHED && !blog.publishedAt) {
        // Auto-set publication date if not provided and transitioning to PUBLISHED
        blog.publishedAt = new Date();
      } else if (status === BlogStatus.DRAFT) {
        // Optional: If you revert to draft, do you clear the publishedAt? Usually NO, to keep history.
      }

      await blog.save();
      return blog;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`BlogService.updateStatus DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        id,
        status,
      });
      throw error;
    }
  }

  /**
   * Permanently deletes a blog and heavily relies on DB CASCADE rules
   * to clean up Analytics, Logs, and the BlogTag join table.
   */
  public static async delete(id: string): Promise<void> {
    try {
      const blog = await Blog.findByPk(id);
      if (!blog) {
        throw new NotFoundError('Blog not found for deletion.');
      }

      // Associations (BlogAnalytics, PageViewLog, BlogTag) are CASCADE deleted in the DB
      await blog.destroy();
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`BlogService.delete DB Error: ${error instanceof Error ? error.message : 'Unknown Error'}`, {
        error,
        id,
      });
      throw error;
    }
  }
}
