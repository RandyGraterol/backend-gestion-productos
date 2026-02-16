import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { ProductAttributes } from '../types';

// Define creation attributes (fields that are optional during creation)
interface ProductCreationAttributes
  extends Optional<ProductAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}

/**
 * Product Model
 * Represents inventory items with all their attributes
 */
class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes
{
  public id!: string;
  public sku!: string;
  public name!: string;
  public description?: string;
  public categoryId!: string;
  public brand?: string;
  public unit!: string;
  public price!: number;
  public cost!: number;
  public stock!: number;
  public minStock!: number;
  public maxStock?: number;
  public location?: string;
  public barcode?: string;
  public imageUrl?: string;
  public expiryDate?: Date;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Product.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: 'SKU cannot be empty',
        },
        len: {
          args: [1, 50],
          msg: 'SKU must be between 1 and 50 characters',
        },
      },
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Product name cannot be empty',
        },
        len: {
          args: [1, 200],
          msg: 'Product name must be between 1 and 200 characters',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Unit cannot be empty',
        },
        len: {
          args: [1, 20],
          msg: 'Unit must be between 1 and 20 characters',
        },
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Price must be greater than or equal to 0',
        },
      },
      get() {
        const value = this.getDataValue('price');
        return value ? parseFloat(value.toString()) : 0;
      },
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'Cost must be greater than or equal to 0',
        },
      },
      get() {
        const value = this.getDataValue('cost');
        return value ? parseFloat(value.toString()) : 0;
      },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Stock must be greater than or equal to 0',
        },
      },
    },
    minStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Minimum stock must be greater than or equal to 0',
        },
      },
    },
    maxStock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: [0],
          msg: 'Maximum stock must be greater than or equal to 0',
        },
      },
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    barcode: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: {
          msg: 'Expiry date must be a valid date',
          args: true,
        },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: 'products',
    timestamps: true,
  }
);

export default Product;
