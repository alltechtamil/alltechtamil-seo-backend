import { Op } from 'sequelize';
import { Blog, User, Category, Tag, SearchLog, Image, BlogAnalytics } from '../models';
import { NotFoundError } from '../utils/AppError.util';
import { BlogStatus } from '../types/enums';
import { IPaginationQuery, IPaginationMeta, buildPaginationMeta } from '../utils/paginate';
import logger from '../utils/logger';

/**
 * Common Sequelize include array for fetching standard relational data on public endpoints.
 * Explicitly blocks sensitive author fields like passwordHash and role.
 */
const PUBLIC_INCLUDES = [
  {
    model: User,
    as: 'author',
    attributes: ['id', 'name', 'avatarUrl'],
  },
  { model: Category, attributes: ['id', 'name', 'slug'] },
  { model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'slug'] },
  { model: Image, attributes: ['id', 'cdnUrl', 'width', 'height', 'altText'] },
  { model: BlogAnalytics, attributes: ['totalViews', 'avgReadTimeSec'] },
];

/**
 * Exclude heavy/admin fields from List views to maintain high performance
 * and low network payloads on the frontend feed pages.
 */
const EXCLUDE_LIST_ATTRIBUTES = [
  'contentHtml',
  'seoTitle',
  'seoDescription',
  'focusKeyword',
  'canonicalUrl',
  'structuredData',
  'ogTitle',
  'ogDescription',
];

export class PublicService {
  /**
   * Retrieves a paginated list of Published Blogs.
   * Excludes heavy HTML content and SEO metadata.
   */
  public static async getPublishedBlogs(
    pagination: IPaginationQuery,
    page: number,
    featuredOnly: boolean = false
  ): Promise<{ rows: Blog[]; count: number; meta: IPaginationMeta }> {
    try {
      const whereClause: Record<string, unknown> = {
        status: BlogStatus.PUBLISHED,
      };

      if (featuredOnly) {
        whereClause.isFeatured = true;
      }

      const count = await Blog.count({
        where: whereClause,
      });

      const rows = await Blog.findAll({
        where: whereClause,
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['publishedAt', 'DESC']],
        attributes: { exclude: EXCLUDE_LIST_ATTRIBUTES },
        include: PUBLIC_INCLUDES,
      });

      const meta = buildPaginationMeta(count, page, pagination.limit);

      return { rows, count, meta };
    } catch (error) {
      logger.error(`PublicService.getPublishedBlogs DB Error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Retrieves a fully detailed blog by its slug for frontend rendering.
   * Enforces that the blog must be PUBLISHED.
   * Includes complete HTML body and SEO attributes.
   */
  public static async getPublishedBlogBySlug(slug: string): Promise<Blog> {
    try {
      const blog = await Blog.findOne({
        where: {
          slug,
          status: BlogStatus.PUBLISHED,
        },
        include: PUBLIC_INCLUDES,
      });

      if (!blog) {
        throw new NotFoundError(`Blog with slug '${slug}' not found or not published.`);
      }

      return blog;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error(`PublicService.getPublishedBlogBySlug DB Error: ${(error as Error).message}`, { slug });
      throw error;
    }
  }

  /**
   * Executes a full-text search across Blog Titles and Excerpts.
   * Logs the search intent asynchronously.
   */
  public static async searchBlogs(
    query: string,
    pagination: IPaginationQuery,
    page: number
  ): Promise<{ rows: Blog[]; count: number; meta: IPaginationMeta }> {
    try {
      const whereClause = {
        status: BlogStatus.PUBLISHED,
        [Op.or]: [{ title: { [Op.iLike]: `%${query}%` } }, { excerpt: { [Op.iLike]: `%${query}%` } }],
      };

      const count = await Blog.count({
        where: whereClause,
      });

      const rows = await Blog.findAll({
        where: whereClause,
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['publishedAt', 'DESC']],
        attributes: { exclude: EXCLUDE_LIST_ATTRIBUTES },
        include: PUBLIC_INCLUDES,
      });

      const meta = buildPaginationMeta(count, page, pagination.limit);

      // Async/Non-blocking query log tracking
      SearchLog.create({
        query: query.trim(),
        resultCount: count,
      }).catch((logError) => {
        logger.error(`Async SearchLog creation failed: ${(logError as Error).message}`, { query });
      });

      return { rows, count, meta };
    } catch (error) {
      logger.error(`PublicService.searchBlogs DB Error: ${(error as Error).message}`, { query });
      throw error;
    }
  }

  /**
   * Retrieves published blogs strictly mapped to a specific Category Slug.
   */
  public static async getBlogsByCategory(
    categorySlug: string,
    pagination: IPaginationQuery,
    page: number
  ): Promise<{ rows: Blog[]; count: number; meta: IPaginationMeta }> {
    try {
      const count = await Blog.count({
        where: {
          status: BlogStatus.PUBLISHED,
        },
        include: [
          {
            model: Category,
            where: { slug: categorySlug },
            attributes: [],
          }
        ],
      });

      const rows = await Blog.findAll({
        where: {
          status: BlogStatus.PUBLISHED,
        },
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['publishedAt', 'DESC']],
        attributes: { exclude: EXCLUDE_LIST_ATTRIBUTES },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'avatarUrl'],
          },
          {
            model: Category,
            where: { slug: categorySlug },
            attributes: ['id', 'name', 'slug'],
          },
          { model: Tag, through: { attributes: [] }, attributes: ['id', 'name', 'slug'] },
          { model: Image, attributes: ['id', 'cdnUrl', 'width', 'height', 'altText'] },
          { model: BlogAnalytics, attributes: ['totalViews', 'avgReadTimeSec'] },
        ],
      });

      const meta = buildPaginationMeta(count, page, pagination.limit);

      return { rows, count, meta };
    } catch (error) {
      logger.error(`PublicService.getBlogsByCategory DB Error: ${(error as Error).message}`, { categorySlug });
      throw error;
    }
  }

  /**
   * Retrieves published blogs strictly mapped to a specific Tag Slug.
   */
  public static async getBlogsByTag(
    tagSlug: string,
    pagination: IPaginationQuery,
    page: number
  ): Promise<{ rows: Blog[]; count: number; meta: IPaginationMeta }> {
    try {
      const count = await Blog.count({
        where: {
          status: BlogStatus.PUBLISHED,
        },
        include: [
          {
            model: Tag,
            where: { slug: tagSlug },
            attributes: [],
          }
        ],
      });

      const rows = await Blog.findAll({
        where: {
          status: BlogStatus.PUBLISHED,
        },
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['publishedAt', 'DESC']],
        attributes: { exclude: EXCLUDE_LIST_ATTRIBUTES },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'avatarUrl'],
          },
          { model: Category, attributes: ['id', 'name', 'slug'] },
          {
            model: Tag,
            where: { slug: tagSlug },
            through: { attributes: [] },
            attributes: ['id', 'name', 'slug'],
          },
          { model: Image, attributes: ['id', 'cdnUrl', 'width', 'height', 'altText'] },
          { model: BlogAnalytics, attributes: ['totalViews', 'avgReadTimeSec'] },
        ],
      });

      const meta = buildPaginationMeta(count, page, pagination.limit);

      return { rows, count, meta };
    } catch (error) {
      logger.error(`PublicService.getBlogsByTag DB Error: ${(error as Error).message}`, { tagSlug });
      throw error;
    }
  }
}

export default PublicService;
