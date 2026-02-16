import { Sequelize } from 'sequelize';
import { config } from './env';

/**
 * Sequelize instance for SQLite3 database
 */
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.database.path,
  logging: config.database.logging ? console.log : false,
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: false,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

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
