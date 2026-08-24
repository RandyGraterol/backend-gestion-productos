import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import AppVersion from './AppVersion';

export interface DownloadLogAttributes {
  id: string;
  appVersionId: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DownloadLogCreationAttributes
  extends Optional<DownloadLogAttributes, 'id' | 'ipAddress' | 'userAgent' | 'createdAt' | 'updatedAt'> {}

class DownloadLog
  extends Model<DownloadLogAttributes, DownloadLogCreationAttributes>
  implements DownloadLogAttributes
{
  public id!: string;
  public appVersionId!: string;
  public email!: string;
  public ipAddress?: string | null;
  public userAgent?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DownloadLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    appVersionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'app_versions',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(500),
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
    tableName: 'download_logs',
    timestamps: true,
    indexes: [
      { fields: ['appVersionId'] },
      { fields: ['email'] },
      { fields: ['createdAt'] },
    ],
  }
);

// Associations
AppVersion.hasMany(DownloadLog, {
  foreignKey: 'appVersionId',
  as: 'downloadLogs',
});

DownloadLog.belongsTo(AppVersion, {
  foreignKey: 'appVersionId',
  as: 'version',
});

export default DownloadLog;
