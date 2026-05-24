import { sequelize } from '../config/database';
import User from './User';
import RefreshToken from './RefreshToken';
import Category from './Category';
import Tag from './Tag';
import Blog from './Blog';
import BlogTag from './BlogTag';
import Image from './Image';
import BlogAnalytics from './BlogAnalytics';
import PageViewLog from './PageViewLog';
import SearchLog from './SearchLog';
import AdUnit from './AdUnit';
import ErrorLog from './ErrorLog';

// =========================================================================
// MODEL ASSOCIATIONS (Authoritative Parity with Section 5 Specification)
// =========================================================================

// User associations
User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(Blog, { foreignKey: 'authorId', onDelete: 'RESTRICT' });
User.hasMany(Image, { foreignKey: 'uploadedBy', onDelete: 'RESTRICT' });
User.hasMany(ErrorLog, { foreignKey: 'userId', onDelete: 'SET_NULL' });

// RefreshToken associations
RefreshToken.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });

// Category associations
Category.hasMany(Blog, { foreignKey: 'categoryId', onDelete: 'SET_NULL' });

// Tag associations
Tag.belongsToMany(Blog, {
  through: BlogTag,
  foreignKey: 'tagId',
  otherKey: 'blogId',
  onDelete: 'CASCADE',
});

// Blog associations
Blog.belongsTo(User, { as: 'author', foreignKey: 'authorId', onDelete: 'RESTRICT' });
Blog.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'SET_NULL' });
Blog.belongsToMany(Tag, {
  through: BlogTag,
  foreignKey: 'blogId',
  otherKey: 'tagId',
  onDelete: 'CASCADE',
});
Blog.hasOne(BlogAnalytics, { foreignKey: 'blogId', onDelete: 'CASCADE' });
Blog.hasMany(Image, { foreignKey: 'blogId', onDelete: 'SET_NULL' });
Blog.hasMany(PageViewLog, { foreignKey: 'blogId', onDelete: 'CASCADE' });

// Image associations
Image.belongsTo(Blog, { foreignKey: 'blogId', onDelete: 'SET_NULL' });
Image.belongsTo(User, { as: 'uploader', foreignKey: 'uploadedBy', onDelete: 'RESTRICT' });

// BlogAnalytics associations
BlogAnalytics.belongsTo(Blog, { foreignKey: 'blogId', onDelete: 'CASCADE' });

// PageViewLog associations
PageViewLog.belongsTo(Blog, { foreignKey: 'blogId', onDelete: 'CASCADE' });

// ErrorLog associations
ErrorLog.belongsTo(User, { foreignKey: 'userId', onDelete: 'SET_NULL' });

export {
  sequelize,
  User,
  RefreshToken,
  Category,
  Tag,
  Blog,
  BlogTag,
  Image,
  BlogAnalytics,
  PageViewLog,
  SearchLog,
  AdUnit,
  ErrorLog,
};
