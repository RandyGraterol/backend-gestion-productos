import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { StockMovementHeaderAttributes, StockMovementHeaderCreationAttributes } from '../types';

// Define creation attributes (fields that are optional during creation)
interface StockMovementCreationAttributes
  extends Optional<StockMovementHeaderCreationAttributes, 'id' | 'createdAt' | 'totalAmountUSD' | 'totalAmountVES' | 'itemCount'> {}

/**
 * StockMovement Model (Header)
 * Represents a stock movement document containing multiple product lines
 */
class StockMovement
  extends Model<StockMovementHeaderAttributes, StockMovementCreationAttributes>
  implements StockMovementHeaderAttributes
{
  public id!: string;
  public type!: 'in' | 'out' | 'adjustment' | 'transfer' | 'credit';
  public reason?: string;
  public reference?: string;
  public userId!: string;
  public exchangeRate?: number;
  public totalAmountUSD!: number;
  public totalAmountVES!: number;
  public itemCount!: number;
  public readonly createdAt!: Date;

  // Associations
  public readonly items?: any[];
}

StockMovement.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('in', 'out', 'adjustment', 'transfer', 'credit'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['in', 'out', 'adjustment', 'transfer', 'credit']],
          msg: 'Type must be one of: in, out, adjustment, transfer, credit',
        },
      },
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    totalAmountUSD: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Total amount USD must be greater than or equal to 0',
        },
      },
    },
    totalAmountVES: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Total amount VES must be greater than or equal to 0',
        },
      },
    },
    itemCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [1],
          msg: 'Item count must be at least 1',
        },
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'stock_movements',
    timestamps: true,
    updatedAt: false, // Stock movements are immutable, no updatedAt needed
    indexes: [
      {
        fields: ['userId'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['createdAt'],
      },
    ],
  }
);

export default StockMovement;