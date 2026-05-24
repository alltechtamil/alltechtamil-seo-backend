import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * BlogTag Attributes Interface
 */
export interface IBlogTagAttributes {
  blogId: string;
  tagId: string;
}

/**
 * Standard Sequelize representation of the 'blog_tags' entity.
 * Represents the many-to-many relationship join table between blogs and tags.
 */
export class BlogTag extends Model<IBlogTagAttributes> implements IBlogTagAttributes {
  declare public blogId: string;
  declare public tagId: string;
}

BlogTag.init(
  {
    blogId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'blog_id',
      references: {
        model: 'blogs',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    tagId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'tag_id',
      references: {
        model: 'tags',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'blog_tags',
    underscored: true,
    timestamps: false, // Join table has no timestamps
  }
);

export default BlogTag;
