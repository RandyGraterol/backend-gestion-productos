import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type MembershipPaymentStatus = 'pendiente' | 'aprobado' | 'rechazado';
export type MembershipPlan = 'mensual' | 'anual' | 'lifetime';

export interface MembershipPaymentAttributes {
  id: string;
  userId: string;
  plan: MembershipPlan;
  amount: string;
  currency: string;
  paymentMethod: string;
  comment?: string | null;
  screenshotPath?: string | null;
  screenshotName?: string | null;
  status: MembershipPaymentStatus;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  expiryDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MembershipPaymentCreationAttributes
  extends Optional<MembershipPaymentAttributes, 'id' | 'comment' | 'screenshotPath' | 'screenshotName' | 'reviewedAt' | 'reviewedBy' | 'expiryDate' | 'createdAt' | 'updatedAt'> {}

class MembershipPayment
  extends Model<MembershipPaymentAttributes, MembershipPaymentCreationAttributes>
  implements MembershipPaymentAttributes
{
  public id!: string;
  public userId!: string;
  public plan!: MembershipPlan;
  public amount!: string;
  public currency!: string;
  public paymentMethod!: string;
  public comment?: string | null;
  public screenshotPath?: string | null;
  public screenshotName?: string | null;
  public status!: MembershipPaymentStatus;
  public reviewedAt?: Date | null;
  public reviewedBy?: string | null;
  public expiryDate?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MembershipPayment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    plan: {
      type: DataTypes.ENUM('mensual', 'anual', 'lifetime'),
      allowNull: false,
    },
    amount: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'USD',
    },
    paymentMethod: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    screenshotPath: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    screenshotName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
      allowNull: false,
      defaultValue: 'pendiente',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'membership_payments',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['plan'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default MembershipPayment;
