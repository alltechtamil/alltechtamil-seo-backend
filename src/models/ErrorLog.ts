import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { DB_CONSTRAINTS } from '../config/constants';
import { ErrorSeverity, ErrorType } from '../types/enums';

/**
 * ErrorLog Attributes Interface
 */
export interface IErrorLogAttributes {
  id: string;
  correlationId?: string | null;
  errorCode?: string | null;
  errorMessage: string;
  stackTrace?: string | null;
  fileName?: string | null;
  functionName?: string | null;
  severity: ErrorSeverity;
  errorType: ErrorType;
  requestUrl?: string | null;
  requestMethod?: string | null;
  ipAddress?: string | null;
  userId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * ErrorLog Creation Attributes Interface
 */
export type IErrorLogCreationAttributes = Optional<
  IErrorLogAttributes,
  | 'id'
  | 'correlationId'
  | 'errorCode'
  | 'stackTrace'
  | 'fileName'
  | 'functionName'
  | 'severity'
  | 'requestUrl'
  | 'requestMethod'
  | 'ipAddress'
  | 'userId'
  | 'createdAt'
  | 'updatedAt'
>;

/**
 * Standard Sequelize representation of the 'error_logs' entity.
 * Persists unexpected server exceptions and critical runtime warnings for diagnostic tracking.
 */
export class ErrorLog extends Model<IErrorLogAttributes, IErrorLogCreationAttributes> implements IErrorLogAttributes {
  declare public id: string;
  declare public correlationId: string | null;
  declare public errorCode: string | null;
  declare public errorMessage: string;
  declare public stackTrace: string | null;
  declare public fileName: string | null;
  declare public functionName: string | null;
  declare public severity: ErrorSeverity;
  declare public errorType: ErrorType;
  declare public requestUrl: string | null;
  declare public requestMethod: string | null;
  declare public ipAddress: string | null;
  declare public userId: string | null;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

ErrorLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    correlationId: {
      type: DataTypes.STRING(DB_CONSTRAINTS.ERROR_LOG.MAX_CORRELATION_ID),
      allowNull: true,
      field: 'correlation_id',
    },
    errorCode: {
      type: DataTypes.STRING(DB_CONSTRAINTS.ERROR_LOG.MAX_ERROR_CODE),
      allowNull: true,
      field: 'error_code',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'error_message',
    },
    stackTrace: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'stack_trace',
    },
    fileName: {
      type: DataTypes.STRING(DB_CONSTRAINTS.ERROR_LOG.MAX_FILE_NAME),
      allowNull: true,
      field: 'file_name',
    },
    functionName: {
      type: DataTypes.STRING(DB_CONSTRAINTS.ERROR_LOG.MAX_FUNCTION_NAME),
      allowNull: true,
      field: 'function_name',
    },
    severity: {
      type: DataTypes.ENUM(...Object.values(ErrorSeverity)),
      allowNull: false,
      defaultValue: ErrorSeverity.MEDIUM,
    },
    errorType: {
      type: DataTypes.ENUM(...Object.values(ErrorType)),
      allowNull: false,
      field: 'error_type',
    },
    requestUrl: {
      type: DataTypes.STRING(DB_CONSTRAINTS.ERROR_LOG.MAX_REQUEST_URL),
      allowNull: true,
      field: 'request_url',
    },
    requestMethod: {
      type: DataTypes.STRING(DB_CONSTRAINTS.ERROR_LOG.MAX_REQUEST_METHOD),
      allowNull: true,
      field: 'request_method',
    },
    ipAddress: {
      type: DataTypes.STRING(DB_CONSTRAINTS.ERROR_LOG.MAX_IP_ADDRESS),
      allowNull: true,
      field: 'ip_address',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
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
    tableName: 'error_logs',
    underscored: true,
    timestamps: true,
  }
);

export default ErrorLog;
