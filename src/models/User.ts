import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database';
import { SECURITY, DB_CONSTRAINTS } from '../config/constants';

/**
 * User Roles
 */
export type UserRole = 'superadmin' | 'editor';

/**
 * User Attributes Interface
 */
export interface IUserAttributes {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User Creation Attributes Interface
 */
export type IUserCreationAttributes = Optional<
  IUserAttributes,
  'id' | 'role' | 'avatarUrl' | 'isActive' | 'lastLoginAt' | 'createdAt' | 'updatedAt'
>;

/**
 * Standard Sequelize representation of the 'users' entity.
 * Holds administrative credentials and access control parameters.
 */
export class User extends Model<IUserAttributes, IUserCreationAttributes> implements IUserAttributes {
  declare public id: string;
  declare public name: string;
  declare public email: string;
  declare public passwordHash: string;
  declare public role: UserRole;
  declare public avatarUrl: string | null;
  declare public isActive: boolean;
  declare public lastLoginAt: Date | null;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;

  /**
   * Validates plain text password input against the stored bcrypt password hash.
   * @param plain Plain text password string
   * @returns Comparison success boolean
   */
  public async validatePassword(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.passwordHash);
  }
}

/**
 * Automatically hashes user passwords before insertion or update.
 */
const hashPasswordHook = async (user: User): Promise<void> => {
  if (user.changed('passwordHash')) {
    const saltRounds = SECURITY.SALT_ROUNDS;
    user.passwordHash = await bcrypt.hash(user.passwordHash, saltRounds);
  }
};

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(DB_CONSTRAINTS.USER.MAX_NAME),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(DB_CONSTRAINTS.USER.MAX_EMAIL),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(DB_CONSTRAINTS.USER.MAX_PASSWORD_HASH),
      allowNull: false,
      field: 'password_hash',
    },
    role: {
      type: DataTypes.ENUM('superadmin', 'editor'),
      allowNull: false,
      defaultValue: 'editor',
    },
    avatarUrl: {
      type: DataTypes.STRING(DB_CONSTRAINTS.USER.MAX_AVATAR_URL),
      allowNull: true,
      field: 'avatar_url',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at',
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
    tableName: 'users',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeCreate: hashPasswordHook,
      beforeUpdate: hashPasswordHook,
    },
  }
);

export default User;
