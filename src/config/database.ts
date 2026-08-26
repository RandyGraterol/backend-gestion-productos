import { Sequelize } from 'sequelize';
import { config } from './env';

/**
 * Sequelize instance - supports PostgreSQL and SQLite
 */
const sequelizeConfig: any = {
  logging: config.database.logging ? (sql: string) => {
    // Skip noisy routine queries (SELECT, INSERT, UPDATE, DELETE)
    const upperSql = sql.toUpperCase().trim();
    if (
      upperSql.startsWith('SELECT') ||
      upperSql.startsWith('INSERT') ||
      upperSql.startsWith('UPDATE') ||
      upperSql.startsWith('DELETE')
    ) {
      return;
    }
    // Only show schema changes (CREATE TABLE, ALTER TABLE, etc.)
    console.log(`🔧 DB: ${sql.substring(0, 300)}`);
  } : false,
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: false,
  },
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
};

// Use PostgreSQL in production, SQLite in development
if (config.database.dialect === 'postgres') {
  sequelizeConfig.dialect = 'postgres';
  sequelizeConfig.host = config.database.host;
  sequelizeConfig.port = config.database.port;
  sequelizeConfig.database = config.database.name;
  sequelizeConfig.username = config.database.user;
  sequelizeConfig.password = config.database.password;
  sequelizeConfig.dialectOptions = {
    ssl: config.database.ssl ? {
      require: true,
      rejectUnauthorized: false,
    } : false,
  };
} else {
  sequelizeConfig.dialect = 'sqlite';
  sequelizeConfig.storage = config.database.path;
}

export const sequelize = new Sequelize(sequelizeConfig);

/**
 * Test database connection
 */
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

/**
 * Sync database models
 * @param force - If true, drop existing tables before creating new ones
 */
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    await sequelize.sync({ force });
    console.log(`Database synchronized successfully${force ? ' (forced)' : ''}.`);
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};

/**
 * Close database connection
 */
export const closeConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
};
