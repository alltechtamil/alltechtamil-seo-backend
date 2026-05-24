import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { DB_CONSTRAINTS } from '../config/constants';
import { BlogStatus } from '../types/enums';
import { slugify } from '../utils/slugify';
import { calculateReadTime } from '../utils/readTime';

/**
 * Blog Attributes Interface
 */
export interface IBlogAttributes {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  contentHtml: string;
  authorId: string;
  categoryId?: string | null;
  status: BlogStatus;
  isFeatured: boolean;
  publishedAt?: Date | null;
  readTimeMinutes: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  focusKeyword?: string | null;
  structuredData?: Record<string, unknown> | null;
  ogImageUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Blog Creation Attributes Interface
 */
export type IBlogCreationAttributes = Optional<
  IBlogAttributes,
  | 'id'
  | 'slug'
  | 'excerpt'
  | 'categoryId'
  | 'status'
  | 'isFeatured'
  | 'publishedAt'
  | 'readTimeMinutes'
  | 'seoTitle'
  | 'seoDescription'
  | 'canonicalUrl'
  | 'focusKeyword'
  | 'structuredData'
  | 'ogImageUrl'
  | 'ogTitle'
  | 'ogDescription'
  | 'createdAt'
  | 'updatedAt'
>;

/**
 * Standard Sequelize representation of the 'blogs' entity.
 * Houses core content body, SEO indices, social tags, and operational states.
 */
export class Blog extends Model<IBlogAttributes, IBlogCreationAttributes> implements IBlogAttributes {
  declare public id: string;
  declare public title: string;
  declare public slug: string;
  declare public excerpt: string | null;
  declare public contentHtml: string;
  declare public authorId: string;
  declare public categoryId: string | null;
  declare public status: BlogStatus;
  declare public isFeatured: boolean;
  declare public publishedAt: Date | null;
  declare public readTimeMinutes: number;
  declare public seoTitle: string | null;
  declare public seoDescription: string | null;
  declare public canonicalUrl: string | null;
  declare public focusKeyword: string | null;
  declare public structuredData: Record<string, unknown> | null;
  declare public ogImageUrl: string | null;
  declare public ogTitle: string | null;
  declare public ogDescription: string | null;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

/**
 * Automatically generates a URL-friendly slug from title before validation.
 */
const generateSlugHook = (blog: Blog): void => {
  if (blog.changed('title') && !blog.changed('slug')) {
    blog.slug = slugify(blog.title);
  } else if (!blog.slug) {
    blog.slug = slugify(blog.title);
  }
};

/**
 * Calculates estimated read time from HTML content before validation.
 */
const calculateReadTimeHook = (blog: Blog): void => {
  if (blog.changed('contentHtml')) {
    blog.readTimeMinutes = calculateReadTime(blog.contentHtml || '');
  }
};

/**
 * Triggers creation of corresponding BlogAnalytics record immediately upon successful database save.
 */
const afterCreateHook = async (blog: Blog, options: any): Promise<void> => {
  const BlogAnalytics = blog.sequelize.models.BlogAnalytics;
  if (BlogAnalytics) {
    await BlogAnalytics.create(
      {
        blogId: blog.id,
        totalViews: 0,
        uniqueVisitors: 0,
        avgReadTimeSec: 0,
        bounceCount: 0,
      },
      { transaction: options.transaction }
    );
  }
};

Blog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(DB_CONSTRAINTS.BLOG.MAX_TITLE),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(DB_CONSTRAINTS.BLOG.MAX_SLUG),
      allowNull: false,
      unique: true,
    },
    excerpt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contentHtml: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'content_html',
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'author_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'category_id',
      references: {
        model: 'categories',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BlogStatus)),
      allowNull: false,
      defaultValue: BlogStatus.DRAFT,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_featured',
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'published_at',
    },
    readTimeMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'read_time_minutes',
    },
    seoTitle: {
      type: DataTypes.STRING(DB_CONSTRAINTS.BLOG.MAX_SEO_TITLE),
      allowNull: true,
      field: 'seo_title',
    },
    seoDescription: {
      type: DataTypes.STRING(DB_CONSTRAINTS.BLOG.MAX_SEO_DESCRIPTION),
      allowNull: true,
      field: 'seo_description',
    },
    canonicalUrl: {
      type: DataTypes.STRING(DB_CONSTRAINTS.BLOG.MAX_CANONICAL_URL),
      allowNull: true,
      field: 'canonical_url',
    },
    focusKeyword: {
      type: DataTypes.STRING(DB_CONSTRAINTS.BLOG.MAX_FOCUS_KEYWORD),
      allowNull: true,
      field: 'focus_keyword',
    },
    structuredData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'structured_data',
    },
    ogImageUrl: {
      type: DataTypes.STRING(DB_CONSTRAINTS.BLOG.MAX_OG_IMAGE_URL),
      allowNull: true,
      field: 'og_image_url',
    },
    ogTitle: {
      type: DataTypes.STRING(DB_CONSTRAINTS.BLOG.MAX_OG_TITLE),
      allowNull: true,
      field: 'og_title',
    },
    ogDescription: {
      type: DataTypes.STRING(DB_CONSTRAINTS.BLOG.MAX_OG_DESCRIPTION),
      allowNull: true,
      field: 'og_description',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'blogs',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeValidate: (blog) => {
        generateSlugHook(blog);
        calculateReadTimeHook(blog);
      },
      afterCreate: afterCreateHook,
    },
  }
);

export default Blog;
