import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { DB_CONSTRAINTS } from '../config/constants';
import { slugify } from '../utils/slugify';

/**
 * Category Attributes Interface
 */
export interface ICategoryAttributes {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Category Creation Attributes Interface
 */
export type ICategoryCreationAttributes = Optional<
  ICategoryAttributes,
  'id' | 'slug' | 'description' | 'metaTitle' | 'metaDescription' | 'isActive' | 'sortOrder' | 'createdAt' | 'updatedAt'
>;

/**
 * Standard Sequelize representation of the 'categories' entity.
 * Houses metadata and taxonomy structures for blog post categorization.
 */
export class Category extends Model<ICategoryAttributes, ICategoryCreationAttributes> implements ICategoryAttributes {
  declare public id: string;
  declare public name: string;
  declare public slug: string;
  declare public description: string | null;
  declare public metaTitle: string | null;
  declare public metaDescription: string | null;
  declare public isActive: boolean;
  declare public sortOrder: number;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

/**
 * Automatically generates a URL-friendly slug from name before validation.
 */
const generateSlugHook = (category: Category): void => {
  if (category.changed('name') && !category.changed('slug')) {
    category.slug = slugify(category.name);
  } else if (!category.slug) {
    category.slug = slugify(category.name);
  }
};

Category.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(DB_CONSTRAINTS.CATEGORY.MAX_NAME),
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING(DB_CONSTRAINTS.CATEGORY.MAX_SLUG),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metaTitle: {
      type: DataTypes.STRING(DB_CONSTRAINTS.CATEGORY.MAX_META_TITLE),
      allowNull: true,
      field: 'meta_title',
    },
    metaDescription: {
      type: DataTypes.STRING(DB_CONSTRAINTS.CATEGORY.MAX_META_DESCRIPTION),
      allowNull: true,
      field: 'meta_description',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
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
    tableName: 'categories',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeValidate: generateSlugHook,
    },
  }
);

export default Category;
