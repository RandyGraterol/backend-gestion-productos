/**
 * Migration Script: SQLite → PostgreSQL
 * 
 * Run with: npx ts-node src/scripts/migrate-to-postgres.ts
 * 
 * This script:
 * 1. Reads all data from SQLite database
 * 2. Creates tables in PostgreSQL
 * 3. Inserts all data preserving relationships
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// SQLite connection (source)
const sqlitePath = process.env.DB_PATH || './database/inventory.sqlite';
const sqlite = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(sqlitePath),
  logging: false,
});

// PostgreSQL connection (destination)
const postgres = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'inventario_db',
  username: process.env.DB_USER || 'inventario_user',
  password: process.env.DB_PASSWORD || 'inventario_secure_2026',
  logging: false,
});

/**
 * Get all table names from SQLite
 */
const getTableNames = async (): Promise<string[]> => {
  const [results] = await sqlite.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  return (results as any[]).map(r => r.name);
};

/**
 * Read all data from a table
 */
const readTable = async (tableName: string): Promise<any[]> => {
  const [results] = await sqlite.query(`SELECT * FROM "${tableName}"`);
  return results as any[];
};

/**
 * Create table in PostgreSQL
 */
const createPostgresTable = async (tableName: string, data: any[]): Promise<void> => {
  if (data.length === 0) return;

  const columns = Object.keys(data[0]);
  
  // Map SQLite types to PostgreSQL types
  const getColumnDef = (col: string, sampleValue: any): string => {
    if (sampleValue === null || sampleValue === undefined) return 'TEXT';
    if (typeof sampleValue === 'number') {
      return Number.isInteger(sampleValue) ? 'INTEGER' : 'DOUBLE PRECISION';
    }
    if (typeof sampleValue === 'boolean') return 'BOOLEAN';
    if (sampleValue instanceof Date) return 'TIMESTAMP WITH TIME ZONE';
    if (typeof sampleValue === 'string') {
      // Check for UUID format
      if (col.toLowerCase().includes('id') && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sampleValue)) {
        return 'UUID';
      }
      return 'TEXT';
    }
    return 'TEXT';
  };

  const columnDefs = columns.map(col => {
    const sampleValue = data[0][col];
    const pgType = getColumnDef(col, sampleValue);
    const isId = col.toLowerCase() === 'id';
    return `"${col}" ${pgType}${isId ? ' PRIMARY KEY' : ''}`;
  });

  // Create table
  await postgres.query(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs.join(', ')})`);
  console.log(`  ✅ Table "${tableName}" created`);
};

/**
 * Insert data into PostgreSQL table
 */
const insertData = async (tableName: string, data: any[]): Promise<number> => {
  if (data.length === 0) return 0;

  const columns = Object.keys(data[0]);
  let inserted = 0;

  // Use transactions for better performance
  const transaction = await postgres.transaction();
  
  try {
    for (const row of data) {
      const values = columns.map(col => row[col]);
      const placeholders = columns.map((_, i) => `$${i + 1}`);
      
      await postgres.query(
        `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) 
         VALUES (${placeholders.join(', ')}) 
         ON CONFLICT ("id") DO NOTHING`,
        { bind: values, transaction }
      );
      inserted++;
    }
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return inserted;
};

/**
 * Main migration function
 */
const migrate = async (): Promise<void> => {
  console.log('🚀 Starting migration: SQLite → PostgreSQL\n');
  console.log(`📁 Source: ${sqlitePath}`);
  console.log(`🐘 Destination: PostgreSQL @ ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);

  try {
    // Test connections
    await sqlite.authenticate();
    console.log('✅ SQLite connection OK');

    await postgres.authenticate();
    console.log('✅ PostgreSQL connection OK\n');

    // Get all tables
    const tables = await getTableNames();
    console.log(`📋 Found ${tables.length} tables: ${tables.join(', ')}\n`);

    // Migrate each table
    let totalRows = 0;
    
    for (const tableName of tables) {
      console.log(`📦 Migrating "${tableName}"...`);
      
      // Read from SQLite
      const data = await readTable(tableName);
      console.log(`  📥 Read ${data.length} rows from SQLite`);
      
      if (data.length > 0) {
        // Create table in PostgreSQL
        await createPostgresTable(tableName, data);
        
        // Insert data
        const inserted = await insertData(tableName, data);
        console.log(`  📤 Inserted ${inserted} rows into PostgreSQL`);
        
        totalRows += inserted;
      }
    }

    console.log(`\n✅ Migration complete! ${totalRows} total rows migrated.`);
    console.log('\n📊 Summary:');
    
    for (const tableName of tables) {
      const count = await postgres.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      console.log(`  ${tableName}: ${(count[0] as any[])[0].count} rows`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sqlite.close();
    await postgres.close();
  }
};

// Run migration
migrate();
