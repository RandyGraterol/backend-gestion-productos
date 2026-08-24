import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface AppVersionAttributes {
  id: string;
  version: string;
  releaseName: string;
  releaseNotes: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  downloadCount: number;
  isActive: boolean;
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AppVersionCreationAttributes
  extends Optional<
    AppVersionAttributes,
    'id' | 'releaseName' | 'releaseNotes' | 'fileSize' | 'mimeType' | 'downloadCount' | 'isActive' | 'uploadedBy' | 'createdAt' | 'updatedAt'
  > {}

class AppVersion
  extends Model<AppVersionAttributes, AppVersionCreationAttributes>
  implements AppVersionAttributes
{
  public id!: string;
  public version!: string;
  public releaseName!: string;
  public releaseNotes!: string;
  public fileName!: string;
  public filePath!: string;
  public fileSize!: number;
  public mimeType!: string;
  public downloadCount!: number;
  public isActive!: boolean;
  public uploadedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AppVersion.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        is: /^\d+\.\d+\.\d+$/,
      },
    },
    releaseName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    releaseNotes: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'application/vnd.android.package-archive',
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
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
    tableName: 'app_versions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['version'],
      },
      {
        fields: ['createdAt'],
      },
    ],
  }
);

export default AppVersion;
