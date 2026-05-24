import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * RefreshToken Attributes Interface
 */
export interface IRefreshTokenAttributes {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
}

/**
 * RefreshToken Creation Attributes Interface
 */
export type IRefreshTokenCreationAttributes = Optional<
  IRefreshTokenAttributes,
  'id' | 'ipAddress' | 'userAgent' | 'createdAt'
>;

/**
 * Standard Sequelize representation of the 'refresh_tokens' entity.
 * Persists hashed refresh tokens to enable secure session rotation.
 */
export class RefreshToken
  extends Model<IRefreshTokenAttributes, IRefreshTokenCreationAttributes>
  implements IRefreshTokenAttributes
{
  declare public id: string;
  declare public userId: string;
  declare public tokenHash: string;
  declare public expiresAt: Date;
  declare public ipAddress: string | null;
  declare public userAgent: string | null;
  declare public readonly createdAt: Date;
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'token_hash',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    underscored: true,
    timestamps: true,
    updatedAt: false, // refresh_tokens only tracks creation timestamp
  }
);

export default RefreshToken;
