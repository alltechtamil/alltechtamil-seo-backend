import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { DB_CONSTRAINTS } from '../config/constants';
import { AdPlacement, AdDeviceTarget } from '../types/enums';

/**
 * AdUnit Attributes Interface
 */
export interface IAdUnitAttributes {
  id: string;
  name: string;
  placement: AdPlacement;
  adScript: string;
  deviceTarget: AdDeviceTarget;
  isActive: boolean;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * AdUnit Creation Attributes Interface
 */
export type IAdUnitCreationAttributes = Optional<
  IAdUnitAttributes,
  'id' | 'deviceTarget' | 'isActive' | 'sortOrder' | 'createdAt' | 'updatedAt'
>;

/**
 * Standard Sequelize representation of the 'ad_units' entity.
 * Defines responsive ad display units and custom JavaScript/HTML advertisement scripts.
 */
export class AdUnit extends Model<IAdUnitAttributes, IAdUnitCreationAttributes> implements IAdUnitAttributes {
  declare public id: string;
  declare public name: string;
  declare public placement: AdPlacement;
  declare public adScript: string;
  declare public deviceTarget: AdDeviceTarget;
  declare public isActive: boolean;
  declare public sortOrder: number;

  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

AdUnit.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(DB_CONSTRAINTS.AD_UNIT.MAX_NAME),
      allowNull: false,
    },
    placement: {
      type: DataTypes.ENUM(...Object.values(AdPlacement)),
      allowNull: false,
    },
    adScript: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'ad_script',
    },
    deviceTarget: {
      type: DataTypes.ENUM(...Object.values(AdDeviceTarget)),
      allowNull: false,
      defaultValue: AdDeviceTarget.ALL,
      field: 'device_target',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
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
    tableName: 'ad_units',
    underscored: true,
    timestamps: true,
  }
);

export default AdUnit;
