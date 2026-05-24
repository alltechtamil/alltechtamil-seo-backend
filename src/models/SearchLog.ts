import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * SearchLog Attributes Interface
 */
export interface ISearchLogAttributes {
  id: string; // BIGSERIAL returned as string in TS to avoid precision loss
  query: string;
  resultCount: number;
  searchedAt?: Date;
}

/**
 * SearchLog Creation Attributes Interface
 */
export type ISearchLogCreationAttributes = Optional<ISearchLogAttributes, 'id' | 'resultCount' | 'searchedAt'>;

/**
 * Standard Sequelize representation of the 'search_logs' entity.
 * Persists raw search terms and matching result counts for search engine optimization analysis.
 */
export class SearchLog
  extends Model<ISearchLogAttributes, ISearchLogCreationAttributes>
  implements ISearchLogAttributes
{
  declare public id: string;
  declare public query: string;
  declare public resultCount: number;
  declare public readonly searchedAt: Date;
}

SearchLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    query: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    resultCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'result_count',
    },
    searchedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'searched_at',
    },
  },
  {
    sequelize,
    tableName: 'search_logs',
    underscored: true,
    timestamps: false, // Search logs are append-only; timestamps is disabled
  }
);

export default SearchLog;
