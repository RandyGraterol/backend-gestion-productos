import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type DonationMethodType = 'pago_movil' | 'transferencia' | 'binance' | 'correo' | 'otro';

export interface DonationMethodAttributes {
  id: string;
  type: DonationMethodType;
  title: string;
  details: string;
  extraInfo?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DonationMethodCreationAttributes
  extends Optional<DonationMethodAttributes, 'id' | 'extraInfo' | 'isActive' | 'sortOrder' | 'createdAt' | 'updatedAt'> {}

class DonationMethod
  extends Model<DonationMethodAttributes, DonationMethodCreationAttributes>
  implements DonationMethodAttributes
{
  public id!: string;
  public type!: DonationMethodType;
  public title!: string;
  public details!: string;
  public extraInfo?: string | null;
  public isActive!: boolean;
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DonationMethod.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('pago_movil', 'transferencia', 'binance', 'correo', 'otro'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    extraInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'donation_methods',
    timestamps: true,
    indexes: [
      { fields: ['isActive'] },
      { fields: ['sortOrder'] },
    ],
  }
);

export default DonationMethod;
