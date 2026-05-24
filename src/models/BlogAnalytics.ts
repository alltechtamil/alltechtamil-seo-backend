import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * BlogAnalytics Attributes Interface
 */
export interface IBlogAnalyticsAttributes {
  id: string;
  blogId: string;
  totalViews: string; // BIGINT mapped as string in TS to avoid precision loss
  uniqueVisitors: string; // BIGINT mapped as string in TS to avoid precision loss
  avgReadTimeSec: number;
  bounceCount: string; // BIGINT mapped as string in TS to avoid precision loss
  lastViewedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * BlogAnalytics Creation Attributes Interface
 */
export type IBlogAnalyticsCreationAttributes = Optional<
  IBlogAnalyticsAttributes,
  'id' | 'totalViews' | 'uniqueVisitors' | 'avgReadTimeSec' | 'bounceCount' | 'lastViewedAt' | 'createdAt' | 'updatedAt'
>;

/**
 * Standard Sequelize representation of the 'blog_analytics' entity.
 * Persists aggregated metric tallies and reader retention stats for each blog post.
 */
export class BlogAnalytics
  extends Model<IBlogAnalyticsAttributes, IBlogAnalyticsCreationAttributes>
  implements IBlogAnalyticsAttributes
{
  declare public id: string;
  declare public blogId: string;
  declare public totalViews: string;
  declare public uniqueVisitors: string;
  declare public avgReadTimeSec: number;
  declare public bounceCount: string;
  declare public lastViewedAt: Date | null;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

BlogAnalytics.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    blogId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'blog_id',
      references: {
        model: 'blogs',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    totalViews: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: '0',
      field: 'total_views',
    },
    uniqueVisitors: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: '0',
      field: 'unique_visitors',
    },
    avgReadTimeSec: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'avg_read_time_sec',
    },
    bounceCount: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: '0',
      field: 'bounce_count',
    },
    lastViewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_viewed_at',
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
    tableName: 'blog_analytics',
    underscored: true,
    timestamps: true,
  }
);

export default BlogAnalytics;
