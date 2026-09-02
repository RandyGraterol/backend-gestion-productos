import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { UserAttributes } from '../types';
import { hashPassword, comparePassword } from '../utils/password';

// Define creation attributes (fields that are optional during creation)
interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    'id' | 'ownerId' | 'phone' | 'businessType' | 'emailVerified' | 'avatar' | 'isActive' | 'registrationIp' | 'registrationLocation' | 'isVpn' | 'customExchangeRate' | 'exchangeRateMode' | 'createdAt' | 'updatedAt'
  > {}

/**
 * User Model
 * Represents system users with authentication and authorization
 */
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password!: string;
  public name!: string;
  public role!: 'admin' | 'client' | 'operator';
  public ownerId?: string | null;
  public phone?: string | null;
  public businessType?: 'bodega' | 'licoreria' | 'abasto' | 'supermercado' | 'farmacia' | 'otro' | null;
  public emailVerified!: boolean;
  public avatar?: string;
  public isActive!: boolean;
  public plan?: 'mensual' | 'anual' | 'lifetime' | null;
  public planStatus?: 'activo' | 'pendiente' | 'expirado' | null;
  public planExpiry?: Date | null;
  public trialStartDate?: Date | null;
  public registrationIp?: string | null;
  public registrationLocation?: string | null;
  public isVpn?: boolean;
  public customExchangeRate?: number | null;
  public exchangeRateMode?: 'auto' | 'manual';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Compare provided password with stored hash
   * @param password - Plain text password to compare
   * @returns True if passwords match
   */
  public async comparePassword(password: string): Promise<boolean> {
    return comparePassword(password, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address',
        },
        notEmpty: {
          msg: 'Email cannot be empty',
        },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Password cannot be empty',
        },
        len: {
          args: [8, 255],
          msg: 'Password must be at least 8 characters long',
        },
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Name cannot be empty',
        },
        len: {
          args: [1, 100],
          msg: 'Name must be between 1 and 100 characters',
        },
      },
    },
    role: {
      type: DataTypes.ENUM('admin', 'client', 'operator'),
      allowNull: false,
      defaultValue: 'client',
      validate: {
        isIn: {
          args: [['admin', 'client', 'operator']],
          msg: 'Role must be one of: admin, client, operator',
        },
      },
    },
    ownerId: {
      // Cliente dueño del inventario (solo para operators)
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    businessType: {
      type: DataTypes.ENUM('bodega', 'licoreria', 'abasto', 'supermercado', 'farmacia', 'otro'),
      allowNull: true,
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    plan: {
      type: DataTypes.ENUM('mensual', 'anual', 'lifetime'),
      allowNull: true,
      defaultValue: null,
    },
    planStatus: {
      type: DataTypes.ENUM('activo', 'pendiente', 'expirado'),
      allowNull: true,
      defaultValue: null,
    },
    planExpiry: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    trialStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    registrationIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      defaultValue: null,
      comment: 'IPv4 or IPv6 address from registration',
    },
    registrationLocation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
      comment: 'Country/City detected from registration IP',
    },
    isVpn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether registration IP belongs to a VPN/proxy network',
    },
    customExchangeRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
      comment: 'Manual exchange rate set by the user (Bs per USD)',
    },
    exchangeRateMode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'auto',
      comment: 'auto = use API rate, manual = use customExchangeRate',
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
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user: User) => {
        // Hash password before creating user
        if (user.password) {
          user.password = await hashPassword(user.password);
        }
      },
      beforeUpdate: async (user: User) => {
        // Hash password before updating if it was changed
        if (user.changed('password')) {
          user.password = await hashPassword(user.password);
        }
      },
    },
  }
);

export default User;
