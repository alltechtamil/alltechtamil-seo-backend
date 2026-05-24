import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * PageViewLog Attributes Interface
 */
export interface IPageViewLogAttributes {
  id: string; // BIGSERIAL returned as string in TS to avoid precision loss
  blogId: string;
  visitorHash: string;
  referrer?: string | null;
  readTimeSec: number;
  isBounce: boolean;
  viewedAt?: Date;
}

/**
 * PageViewLog Creation Attributes Interface
 */
export type IPageViewLogCreationAttributes = Optional<
  IPageViewLogAttributes,
  'id' | 'referrer' | 'readTimeSec' | 'isBounce' | 'viewedAt'
>;

/**
 * Standard Sequelize representation of the 'page_view_logs' entity.
 * Houses raw visitor hits to facilitate batch statistical analytics aggregation.
 */
export class PageViewLog
  extends Model<IPageViewLogAttributes, IPageViewLogCreationAttributes>
  implements IPageViewLogAttributes
{
  declare public id: string;
  declare public blogId: string;
  declare public visitorHash: string;
  declare public referrer: string | null;
  declare public readTimeSec: number;
  declare public isBounce: boolean;
  declare public readonly viewedAt: Date;
}

PageViewLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    blogId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'blog_id',
      references: {
        model: 'blogs',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    visitorHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'visitor_hash',
    },
    referrer: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    readTimeSec: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'read_time_sec',
    },
    isBounce: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_bounce',
    },
    viewedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'viewed_at',
    },
  },
  {
    sequelize,
    tableName: 'page_view_logs',
    underscored: true,
    timestamps: false, // Page view logs are append-only; timestamps is disabled
  }
);

export default PageViewLog;
