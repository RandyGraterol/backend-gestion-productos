/**
 * Migración multi-tenant: roles admin | client | operator
 *
 * - Elimina TODOS los usuarios excepto el admin (empezar limpio)
 *   y sus datos de inventario (cascada manual por seguridad)
 * - Reconstruye el ENUM de roles en PostgreSQL
 * - Agrega la columna ownerId a users
 *
 * Uso: npx ts-node src/scripts/migrate-multitenant.ts
 */
import { sequelize } from '../config/database';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), process.env.NODE_ENV === 'production' ? '.env.production' : '.env') });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@inventario.com';

const run = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('🔗 Conectado a la base de datos');

    const dialect = sequelize.getDialect();

    // 1. Eliminar usuarios no-admin y sus datos (limpieza manual de dependencias)
    if (dialect === 'postgres') {
      await sequelize.query(`
        DELETE FROM stock_movements
        WHERE "userId" NOT IN (SELECT id FROM users WHERE email = :adminEmail)
           OR "productId" IN (SELECT id FROM products WHERE "userId" NOT IN (SELECT id FROM users WHERE email = :adminEmail));
      `, { replacements: { adminEmail: ADMIN_EMAIL } });

      await sequelize.query(`
        DELETE FROM product_images
        WHERE "productId" IN (SELECT id FROM products WHERE "userId" NOT IN (SELECT id FROM users WHERE email = :adminEmail));
      `, { replacements: { adminEmail: ADMIN_EMAIL } });

      for (const table of ['products', 'categories', 'notifications']) {
        await sequelize.query(
          `DELETE FROM ${table} WHERE "userId" NOT IN (SELECT id FROM users WHERE email = :adminEmail);`,
          { replacements: { adminEmail: ADMIN_EMAIL } }
        );
      }

      // 2. Convertir columna role a texto para poder reasignar valores libremente
      await sequelize.query(`ALTER TABLE users ALTER COLUMN role DROP DEFAULT;`);
      await sequelize.query(`ALTER TABLE users ALTER COLUMN role TYPE varchar(20);`);

      // 3. Migrar roles antiguos a client
      await sequelize.query(`UPDATE users SET role = 'client' WHERE role <> 'admin';`);

      // 4. Reconstruir ENUM con los valores nuevos
      await sequelize.query(`DROP TYPE IF EXISTS "enum_users_role";`);
      await sequelize.query(`CREATE TYPE "enum_users_role" AS ENUM ('admin', 'client', 'operator');`);
      await sequelize.query(`ALTER TABLE users ALTER COLUMN role TYPE "enum_users_role" USING role::text::"enum_users_role";`);
      await sequelize.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client';`);

      // 5. Columna ownerId
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "ownerId" UUID REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_users_ownerId ON users("ownerId");`);

      // 6. Garantizar que el admin conserva su rol
      await sequelize.query(`UPDATE users SET role = 'admin' WHERE email = :adminEmail;`, {
        replacements: { adminEmail: ADMIN_EMAIL },
      });

      // 7. Empezar limpio: eliminar usuarios restantes que no sean el admin
      await sequelize.query(`DELETE FROM users WHERE email <> :adminEmail;`, {
        replacements: { adminEmail: ADMIN_EMAIL },
      });
    } else {
      // SQLite: recrear columna role como texto con CHECK lógico
      await sequelize.query(`UPDATE users SET role = 'client' WHERE role <> 'admin';`);
    }

    const [results] = await sequelize.query('SELECT id, email, name, role, "ownerId" FROM users;');
    console.log('✅ Migración completada. Usuarios finales:');
    console.table(results as object[]);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
};

void run();
