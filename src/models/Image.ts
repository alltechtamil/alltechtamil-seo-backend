import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Image Attributes Interface
 */
export interface IImageAttributes {
  id: string;
  blogId?: string | null;
  githubPath: string;
  cdnUrl: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  mimeType: string;
  altText?: string | null;
  uploadedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Image Creation Attributes Interface
 */
export type IImageCreationAttributes = Optional<
  IImageAttributes,
  'id' | 'blogId' | 'mimeType' | 'altText' | 'createdAt' | 'updatedAt'
>;

/**
 * Standard Sequelize representation of the 'images' entity.
 * Holds reference metadata for processed blog assets stored upstream in GitHub.
 */
export class Image extends Model<IImageAttributes, IImageCreationAttributes> implements IImageAttributes {
  declare public id: string;
  declare public blogId: string | null;
  declare public githubPath: string;
  declare public cdnUrl: string;
  declare public width: number;
  declare public height: number;
  declare public fileSizeBytes: number;
  declare public mimeType: string;
  declare public altText: string | null;
  declare public uploadedBy: string;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Image.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    blogId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'blog_id',
    },
    githubPath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'github_path',
    },
    cdnUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'cdn_url',
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fileSizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'file_size_bytes',
    },
    mimeType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'image/webp',
      field: 'mime_type',
    },
    altText: {
      type: DataTypes.STRING(300),
      allowNull: true,
      field: 'alt_text',
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'uploaded_by',
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
    tableName: 'images',
    underscored: true,
    timestamps: true,
  }
);

export default Image;
