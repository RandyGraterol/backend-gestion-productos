const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const seq = new Sequelize(
  process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD,
  { host: 'postgres', port: 5432, dialect: 'postgres', logging: false }
);

(async () => {
  await seq.authenticate();
  const [u] = await seq.query("SELECT id FROM users WHERE email='admin@inventario.com' LIMIT 1");
  if (u.length > 0) { console.log('Admin ya existe'); process.exit(0); }
  const hash = await bcrypt.hash('Admin123!', 10);
  const id = crypto.randomUUID();
  await seq.query(
    'INSERT INTO users (id, email, password, name, role, "isActive", "emailVerified", "createdAt", "updatedAt") VALUES (:id, :email, :password, :name, :role, true, true, NOW(), NOW())',
    { replacements: { id, email: 'admin@inventario.com', password: hash, name: 'Administrador', role: 'admin' } }
  );
  console.log('Admin creado: admin@inventario.com / Admin123!');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
