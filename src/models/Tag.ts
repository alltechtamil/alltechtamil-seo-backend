import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { DB_CONSTRAINTS } from '../config/constants';
import { slugify } from '../utils/slugify';

/**
 * Tag Attributes Interface
 */
export interface ITagAttributes {
  id: string;
  name: string;
  slug: string;
  createdAt?: Date;
}

/**
 * Tag Creation Attributes Interface
 */
export type ITagCreationAttributes = Optional<ITagAttributes, 'id' | 'slug' | 'createdAt'>;

/**
 * Standard Sequelize representation of the 'tags' entity.
 * Houses keyword taxonomy structures for blog post tagging.
 */
export class Tag extends Model<ITagAttributes, ITagCreationAttributes> implements ITagAttributes {
  declare public id: string;
  declare public name: string;
  declare public slug: string;

  declare public readonly createdAt: Date;
}

/**
 * Automatically generates a URL-friendly slug from name before validation.
 */
const generateSlugHook = (tag: Tag): void => {
  if (tag.changed('name') && !tag.changed('slug')) {
    tag.slug = slugify(tag.name);
  } else if (!tag.slug) {
    tag.slug = slugify(tag.name);
  }
};

Tag.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(DB_CONSTRAINTS.TAG.MAX_NAME),
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING(DB_CONSTRAINTS.TAG.MAX_SLUG),
      allowNull: false,
      unique: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'tags',
    underscored: true,
    timestamps: true,
    updatedAt: false, // tags table only tracks creation timestamp
    hooks: {
      beforeValidate: generateSlugHook,
    },
  }
);

export default Tag;
