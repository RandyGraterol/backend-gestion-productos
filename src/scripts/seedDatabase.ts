import { sequelize } from '../config/database';
import User from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const ADMIN_DATA = {
  email: process.env.ADMIN_EMAIL || 'admin@inventario.com',
  password: process.env.ADMIN_PASSWORD || 'Admin123!',
  name: process.env.ADMIN_NAME || 'Administrador',
  role: 'admin' as const,
  isActive: true,
};

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed...\n');

    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida\n');

    await sequelize.sync();
    console.log('✅ Base de datos sincronizada\n');

    const existingAdmin = await User.findOne({
      where: { email: ADMIN_DATA.email },
    });

    if (existingAdmin) {
      console.log('⚠️  El administrador ya existe:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Nombre: ${existingAdmin.name}`);
      console.log(`   Rol: ${existingAdmin.role}`);
      console.log('\n💡 Si deseas restablecer la contraseña, elimina el usuario primero.\n');
      return;
    }

    const admin = await User.create(ADMIN_DATA);

    console.log('✅ Administrador creado exitosamente!\n');
    console.log('📋 Detalles:');
    console.log('   Email:', admin.email);
    console.log('   Nombre:', admin.name);
    console.log('   Rol:', admin.role);
    console.log('\n🔐 Credenciales:');
    console.log('   Email:', ADMIN_DATA.email);
    console.log('   Contraseña:', ADMIN_DATA.password);
    console.log('\n⚠️  Cambia la contraseña después del primer inicio de sesión.\n');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('👋 Conexión cerrada');
  }
}

seedDatabase()
  .then(() => {
    console.log('✅ Seed completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
