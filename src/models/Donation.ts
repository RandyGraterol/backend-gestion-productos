import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type DonationStatus = 'pendiente' | 'revisada' | 'rechazada';

export interface DonationAttributes {
  id: string;
  donorEmail: string;
  amount?: string | null;
  comment: string;
  screenshotPath: string;
  screenshotName?: string | null;
  status: DonationStatus;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DonationCreationAttributes
  extends Optional<DonationAttributes, 'id' | 'amount' | 'screenshotName' | 'reviewedAt' | 'createdAt' | 'updatedAt'> {}

class Donation
  extends Model<DonationAttributes, DonationCreationAttributes>
  implements DonationAttributes
{
  public id!: string;
  public donorEmail!: string;
  public amount?: string | null;
  public comment!: string;
  public screenshotPath!: string;
  public screenshotName?: string | null;
  public status!: DonationStatus;
  public reviewedAt?: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Donation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    donorEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    amount: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    screenshotPath: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    screenshotName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pendiente', 'revisada', 'rechazada'),
      allowNull: false,
      defaultValue: 'pendiente',
    },
    reviewedAt: {
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
    tableName: 'donations',
    timestamps: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['donorEmail'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default Donation;
