import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { UserAttributes } from '../types';
import { hashPassword, comparePassword } from '../utils/password';

// Define creation attributes (fields that are optional during creation)
interface UserCreationAttributes
  extends Optional<UserAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}

/**
 * User Model
 * Represents system users with authentication and authorization
 */
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password!: string;
  public name!: string;
  public role!: 'admin' | 'manager' | 'employee' | 'viewer';
  public avatar?: string;
  public isActive!: boolean;
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
      type: DataTypes.ENUM('admin', 'manager', 'employee', 'viewer'),
      allowNull: false,
      defaultValue: 'viewer',
      validate: {
        isIn: {
          args: [['admin', 'manager', 'employee', 'viewer']],
          msg: 'Role must be one of: admin, manager, employee, viewer',
        },
      },
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
