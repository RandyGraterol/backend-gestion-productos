import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * ProductImage Attributes Interface
 */
export interface ProductImageAttributes {
  id: string;
  productId: string;
  imageUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ProductImage Creation Attributes
 */
interface ProductImageCreationAttributes
  extends Optional<ProductImageAttributes, 'id' | 'isPrimary' | 'displayOrder' | 'createdAt' | 'updatedAt'> {}

/**
 * ProductImage Model
 * Represents images associated with products
 */
class ProductImage
  extends Model<ProductImageAttributes, ProductImageCreationAttributes>
  implements ProductImageAttributes
{
  public id!: string;
  public productId!: string;
  public imageUrl!: string;
  public fileName!: string;
  public fileSize!: number;
  public mimeType!: string;
  public isPrimary!: boolean;
  public displayOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProductImage.init(
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
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Image URL cannot be empty',
        },
      },
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'File name cannot be empty',
        },
      },
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'File size must be greater than or equal to 0',
        },
      },
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'MIME type cannot be empty',
        },
        isIn: {
          args: [['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']],
          msg: 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP',
        },
      },
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Display order must be greater than or equal to 0',
        },
      },
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
    tableName: 'product_images',
    timestamps: true,
    indexes: [
      {
        fields: ['productId'],
      },
      {
        fields: ['productId', 'isPrimary'],
      },
      {
        fields: ['productId', 'displayOrder'],
      },
    ],
  }
);

export default ProductImage;
