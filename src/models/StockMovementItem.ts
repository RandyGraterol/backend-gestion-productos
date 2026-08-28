import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { StockMovementItemAttributes, StockMovementItemCreationAttributes } from '../types';

// Define creation attributes (fields that are optional during creation)
interface StockMovementItemCreationAttrs
  extends Optional<StockMovementItemCreationAttributes, 'id' | 'createdAt'> {}

/**
 * StockMovementItem Model
 * Represents individual product lines within a stock movement
 */
class StockMovementItem
  extends Model<StockMovementItemAttributes, StockMovementItemCreationAttrs>
  implements StockMovementItemAttributes
{
  public id!: string;
  public movementId!: string;
  public productId!: string;
  public quantity!: number;
  public unitPrice!: number;
  public totalPrice!: number;
  public currency!: 'USD' | 'VES';
  public exchangeRateSnapshot!: number;
  public previousStock!: number;
  public newStock!: number;
  public readonly createdAt!: Date;
}

StockMovementItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    movementId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stock_movements',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Quantity must be at least 1',
        },
      },
    },
    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Unit price must be greater than or equal to 0',
        },
      },
    },
    totalPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Total price must be greater than or equal to 0',
        },
      },
    },
    currency: {
      type: DataTypes.ENUM('USD', 'VES'),
      allowNull: false,
      defaultValue: 'USD',
    },
    exchangeRateSnapshot: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 1,
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'stock_movement_items',
    timestamps: true,
    updatedAt: false, // Movement items are immutable
    indexes: [
      {
        fields: ['movementId'],
      },
      {
        fields: ['productId'],
      },
    ],
  }
);

export default StockMovementItem;