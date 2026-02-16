import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { StockMovementAttributes } from '../types';

// Define creation attributes (fields that are optional during creation)
interface StockMovementCreationAttributes
  extends Optional<StockMovementAttributes, 'id' | 'createdAt'> {}

/**
 * StockMovement Model
 * Represents inventory movements (in, out, adjustments, transfers)
 */
class StockMovement
  extends Model<StockMovementAttributes, StockMovementCreationAttributes>
  implements StockMovementAttributes
{
  public id!: string;
  public productId!: string;
  public type!: 'in' | 'out' | 'adjustment' | 'transfer';
  public quantity!: number;
  public previousStock!: number;
  public newStock!: number;
  public reason?: string;
  public reference?: string;
  public userId!: string;
  public readonly createdAt!: Date;
}

StockMovement.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM('in', 'out', 'adjustment', 'transfer'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['in', 'out', 'adjustment', 'transfer']],
          msg: 'Type must be one of: in, out, adjustment, transfer',
        },
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Quantity must be greater than 0',
        },
      },
    },
    previousStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Previous stock must be greater than or equal to 0',
        },
      },
    },
    newStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'New stock must be greater than or equal to 0',
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
  }
);

export default StockMovement;
