/**
 * Migración: registro de clientes con teléfono, tipo de negocio y
 * verificación de correo electrónico.
 *
 * - users.phone            VARCHAR(30) NULL (requerido a nivel API en registros nuevos)
 * - users.businessType     ENUM NULL (requerido a nivel API)
 * - users.emailVerified    BOOLEAN NOT NULL DEFAULT false
 * - Usuarios existentes -> emailVerified = true (no se les bloquea)
 *
 * Uso: npx ts-node src/scripts/migrate-registration-fields.ts
 */
import { sequelize } from '../config/database';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), process.env.NODE_ENV === 'production' ? '.env.production' : '.env') });

const run = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('🔗 Conectado a la base de datos');

    const dialect = sequelize.getDialect();

    if (dialect === 'postgres') {
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
      `);
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_users_business_type AS ENUM
            ('bodega', 'licoreria', 'abasto', 'supermercado', 'farmacia', 'otro');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      `);
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "businessType" enum_users_business_type;
      `);
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
      `);
      // Usuarios existentes quedan verificados automáticamente
      await sequelize.query(`UPDATE users SET "emailVerified" = true;`);
    } else {
      // SQLite (dev local)
      await sequelize.query(`ALTER TABLE users ADD COLUMN phone TEXT;`).catch(() => undefined);
      await sequelize.query(`ALTER TABLE users ADD COLUMN businessType TEXT;`).catch(() => undefined);
      await sequelize.query(`ALTER TABLE users ADD COLUMN emailVerified BOOLEAN NOT NULL DEFAULT 0;`).catch(() => undefined);
      await sequelize.query(`UPDATE users SET emailVerified = 1;`);
    }

    const [rows] = await sequelize.query(
      'SELECT email, role, phone, "businessType", "emailVerified" FROM users;'
    );
    console.log('✅ Migración completada. Usuarios:');
    console.table(rows as object[]);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
};

void run();
