import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface DownloadVerificationAttributes {
  id: string;
  email: string;
  codeHash: string;
  /** Código en texto plano para poder reenviarlo sin regenerar (vive solo 30 min) */
  code?: string | null;
  attempts: number;
  verified: boolean;
  token?: string | null;
  tokenExpiresAt?: Date | null;
  tokenUsed: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface DownloadVerificationCreationAttributes
  extends Optional<
    DownloadVerificationAttributes,
    'id' | 'attempts' | 'verified' | 'token' | 'tokenExpiresAt' | 'tokenUsed' | 'createdAt' | 'updatedAt'
  > {}

class DownloadVerification
  extends Model<DownloadVerificationAttributes, DownloadVerificationCreationAttributes>
  implements DownloadVerificationAttributes
{
  public id!: string;
  public email!: string;
  public codeHash!: string;
  public code?: string | null;
  public attempts!: number;
  public verified!: boolean;
  public token?: string | null;
  public tokenExpiresAt?: Date | null;
  public tokenUsed!: boolean;
  public expiresAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DownloadVerification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    codeHash: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    token: {
      type: DataTypes.STRING(128),
      allowNull: true,
      unique: true,
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tokenUsed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: 'download_verifications',
    timestamps: true,
    indexes: [
      {
        fields: ['email'],
      },
      {
        fields: ['token'],
      },
      {
        fields: ['expiresAt'],
      },
    ],
  }
);

export default DownloadVerification;
