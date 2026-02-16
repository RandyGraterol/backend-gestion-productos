import { sequelize } from '../config/database';
import User from '../models/User';
import Category from '../models/Category';
import Product from '../models/Product';
import StockMovement from '../models/StockMovement';

/**
 * Seed script to populate database with test data
 * Creates 30+ records for each model
 */

// User data with plain passwords for development
const usersData = [
  { email: 'admin@inventory.com', password: 'Admin123!', name: 'Admin Principal', role: 'admin' as const },
  { email: 'admin2@inventory.com', password: 'Admin123!', name: 'Admin Secundario', role: 'admin' as const },
  { email: 'manager1@inventory.com', password: 'Manager123!', name: 'Carlos Rodríguez', role: 'manager' as const },
  { email: 'manager2@inventory.com', password: 'Manager123!', name: 'María González', role: 'manager' as const },
  { email: 'manager3@inventory.com', password: 'Manager123!', name: 'Juan Pérez', role: 'manager' as const },
  { email: 'manager4@inventory.com', password: 'Manager123!', name: 'Ana Martínez', role: 'manager' as const },
  { email: 'manager5@inventory.com', password: 'Manager123!', name: 'Luis Fernández', role: 'manager' as const },
  { email: 'employee1@inventory.com', password: 'Employee123!', name: 'Pedro Sánchez', role: 'employee' as const },
  { email: 'employee2@inventory.com', password: 'Employee123!', name: 'Laura López', role: 'employee' as const },
  { email: 'employee3@inventory.com', password: 'Employee123!', name: 'Miguel Torres', role: 'employee' as const },
  { email: 'employee4@inventory.com', password: 'Employee123!', name: 'Carmen Ruiz', role: 'employee' as const },
  { email: 'employee5@inventory.com', password: 'Employee123!', name: 'José García', role: 'employee' as const },
  { email: 'employee6@inventory.com', password: 'Employee123!', name: 'Isabel Moreno', role: 'employee' as const },
  { email: 'employee7@inventory.com', password: 'Employee123!', name: 'Francisco Jiménez', role: 'employee' as const },
  { email: 'employee8@inventory.com', password: 'Employee123!', name: 'Rosa Álvarez', role: 'employee' as const },
  { email: 'employee9@inventory.com', password: 'Employee123!', name: 'Antonio Romero', role: 'employee' as const },
  { email: 'employee10@inventory.com', password: 'Employee123!', name: 'Lucía Navarro', role: 'employee' as const },
  { email: 'employee11@inventory.com', password: 'Employee123!', name: 'Manuel Díaz', role: 'employee' as const },
  { email: 'employee12@inventory.com', password: 'Employee123!', name: 'Teresa Muñoz', role: 'employee' as const },
  { email: 'employee13@inventory.com', password: 'Employee123!', name: 'Javier Serrano', role: 'employee' as const },
  { email: 'employee14@inventory.com', password: 'Employee123!', name: 'Pilar Blanco', role: 'employee' as const },
  { email: 'employee15@inventory.com', password: 'Employee123!', name: 'Rafael Castro', role: 'employee' as const },
  { email: 'viewer1@inventory.com', password: 'Viewer123!', name: 'Sofía Ortega', role: 'viewer' as const },
  { email: 'viewer2@inventory.com', password: 'Viewer123!', name: 'Daniel Rubio', role: 'viewer' as const },
  { email: 'viewer3@inventory.com', password: 'Viewer123!', name: 'Elena Molina', role: 'viewer' as const },
  { email: 'viewer4@inventory.com', password: 'Viewer123!', name: 'Pablo Gil', role: 'viewer' as const },
  { email: 'viewer5@inventory.com', password: 'Viewer123!', name: 'Marta Vega', role: 'viewer' as const },
  { email: 'viewer6@inventory.com', password: 'Viewer123!', name: 'Sergio Ramos', role: 'viewer' as const },
  { email: 'viewer7@inventory.com', password: 'Viewer123!', name: 'Cristina Herrera', role: 'viewer' as const },
  { email: 'viewer8@inventory.com', password: 'Viewer123!', name: 'Alberto Medina', role: 'viewer' as const },
  { email: 'viewer9@inventory.com', password: 'Viewer123!', name: 'Beatriz Cortés', role: 'viewer' as const },
  { email: 'viewer10@inventory.com', password: 'Viewer123!', name: 'Raúl Iglesias', role: 'viewer' as const },
];

// Categories data
const categoriesData = [
  { name: 'Electrónica', description: 'Productos electrónicos y tecnología', icon: '💻', color: '#3B82F6' },
  { name: 'Computadoras', description: 'Laptops, desktops y accesorios', icon: '🖥️', color: '#6366F1' },
  { name: 'Smartphones', description: 'Teléfonos móviles y tablets', icon: '📱', color: '#8B5CF6' },
  { name: 'Audio', description: 'Auriculares, altavoces y equipos de sonido', icon: '🎧', color: '#A855F7' },
  { name: 'Hogar', description: 'Productos para el hogar', icon: '🏠', color: '#EC4899' },
  { name: 'Cocina', description: 'Electrodomésticos y utensilios de cocina', icon: '🍳', color: '#F43F5E' },
  { name: 'Muebles', description: 'Muebles y decoración', icon: '🛋️', color: '#EF4444' },
  { name: 'Iluminación', description: 'Lámparas y sistemas de iluminación', icon: '💡', color: '#F59E0B' },
  { name: 'Deportes', description: 'Artículos deportivos y fitness', icon: '⚽', color: '#10B981' },
  { name: 'Fitness', description: 'Equipamiento para gimnasio', icon: '🏋️', color: '#059669' },
  { name: 'Outdoor', description: 'Deportes al aire libre', icon: '🏕️', color: '#14B8A6' },
  { name: 'Ropa Deportiva', description: 'Indumentaria deportiva', icon: '👕', color: '#06B6D4' },
  { name: 'Oficina', description: 'Suministros y mobiliario de oficina', icon: '📎', color: '#0EA5E9' },
  { name: 'Papelería', description: 'Papel, bolígrafos y material de escritura', icon: '✏️', color: '#3B82F6' },
  { name: 'Mobiliario Oficina', description: 'Escritorios, sillas y archivadores', icon: '🪑', color: '#6366F1' },
  { name: 'Tecnología Oficina', description: 'Impresoras, escáneres y equipos', icon: '🖨️', color: '#8B5CF6' },
  { name: 'Alimentos', description: 'Productos alimenticios', icon: '🍕', color: '#F97316' },
  { name: 'Bebidas', description: 'Bebidas y refrescos', icon: '🥤', color: '#FB923C' },
  { name: 'Snacks', description: 'Aperitivos y golosinas', icon: '🍿', color: '#FDBA74' },
  { name: 'Congelados', description: 'Productos congelados', icon: '🧊', color: '#60A5FA' },
  { name: 'Salud', description: 'Productos de salud y bienestar', icon: '💊', color: '#22C55E' },
  { name: 'Vitaminas', description: 'Suplementos y vitaminas', icon: '💉', color: '#4ADE80' },
  { name: 'Cuidado Personal', description: 'Higiene y cuidado personal', icon: '🧴', color: '#86EFAC' },
  { name: 'Primeros Auxilios', description: 'Botiquín y emergencias', icon: '🩹', color: '#BBF7D0' },
  { name: 'Juguetes', description: 'Juguetes y entretenimiento', icon: '🧸', color: '#FDE047' },
  { name: 'Juegos Mesa', description: 'Juegos de mesa y cartas', icon: '🎲', color: '#FEF08A' },
  { name: 'Construcción', description: 'Bloques y sets de construcción', icon: '🧱', color: '#FEF9C3' },
  { name: 'Peluches', description: 'Muñecos de peluche', icon: '🐻', color: '#FECACA' },
  { name: 'Automotriz', description: 'Accesorios y repuestos para vehículos', icon: '🚗', color: '#94A3B8' },
  { name: 'Repuestos', description: 'Piezas de repuesto', icon: '🔧', color: '#CBD5E1' },
  { name: 'Accesorios Auto', description: 'Accesorios para el automóvil', icon: '🎵', color: '#E2E8F0' },
  { name: 'Herramientas', description: 'Herramientas y equipos', icon: '🔨', color: '#64748B' },
];

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida\n');

    // Sync database (force: true will drop existing tables)
    await sequelize.sync({ force: true });
    console.log('✅ Base de datos sincronizada\n');

    // ========================================
    // SEED USERS
    // ========================================
    console.log('👥 Creando usuarios...');
    console.log('=' .repeat(80));
    
    const users = [];
    for (const userData of usersData) {
      const user = await User.create(userData);
      users.push(user);
      console.log(`✓ ${userData.role.toUpperCase().padEnd(10)} | ${userData.email.padEnd(30)} | Password: ${userData.password}`);
    }
    
    console.log(`\n✅ ${users.length} usuarios creados\n`);

    // ========================================
    // SEED CATEGORIES
    // ========================================
    console.log('📁 Creando categorías...');
    
    const categories = [];
    for (const categoryData of categoriesData) {
      const category = await Category.create(categoryData);
      categories.push(category);
    }
    
    console.log(`✅ ${categories.length} categorías creadas\n`);

    // ========================================
    // SEED PRODUCTS
    // ========================================
    console.log('📦 Creando productos...');
    
    const productsData = [
      // Electrónica - Computadoras
      { sku: 'COMP-001', name: 'Laptop Dell XPS 15', description: 'Laptop de alto rendimiento', categoryId: categories[1].id, brand: 'Dell', unit: 'unidad', price: 1299.99, cost: 899.99, stock: 15, minStock: 5, maxStock: 50, location: 'A-01' },
      { sku: 'COMP-002', name: 'MacBook Pro 16"', description: 'Laptop profesional Apple', categoryId: categories[1].id, brand: 'Apple', unit: 'unidad', price: 2499.99, cost: 1899.99, stock: 8, minStock: 3, maxStock: 20, location: 'A-02' },
      { sku: 'COMP-003', name: 'HP Pavilion Desktop', description: 'PC de escritorio', categoryId: categories[1].id, brand: 'HP', unit: 'unidad', price: 799.99, cost: 599.99, stock: 12, minStock: 5, maxStock: 30, location: 'A-03' },
      { sku: 'COMP-004', name: 'Monitor LG 27" 4K', description: 'Monitor ultra HD', categoryId: categories[1].id, brand: 'LG', unit: 'unidad', price: 399.99, cost: 299.99, stock: 25, minStock: 10, maxStock: 60, location: 'A-04' },
      { sku: 'COMP-005', name: 'Teclado Mecánico Logitech', description: 'Teclado gaming RGB', categoryId: categories[1].id, brand: 'Logitech', unit: 'unidad', price: 129.99, cost: 79.99, stock: 45, minStock: 15, maxStock: 100, location: 'A-05' },
      
      // Smartphones
      { sku: 'PHONE-001', name: 'iPhone 15 Pro', description: 'Smartphone Apple última generación', categoryId: categories[2].id, brand: 'Apple', unit: 'unidad', price: 1199.99, cost: 899.99, stock: 20, minStock: 8, maxStock: 50, location: 'B-01' },
      { sku: 'PHONE-002', name: 'Samsung Galaxy S24', description: 'Smartphone Android premium', categoryId: categories[2].id, brand: 'Samsung', unit: 'unidad', price: 999.99, cost: 749.99, stock: 30, minStock: 10, maxStock: 70, location: 'B-02' },
      { sku: 'PHONE-003', name: 'Google Pixel 8', description: 'Smartphone con IA avanzada', categoryId: categories[2].id, brand: 'Google', unit: 'unidad', price: 699.99, cost: 499.99, stock: 18, minStock: 8, maxStock: 40, location: 'B-03' },
      { sku: 'PHONE-004', name: 'iPad Air', description: 'Tablet Apple', categoryId: categories[2].id, brand: 'Apple', unit: 'unidad', price: 599.99, cost: 449.99, stock: 22, minStock: 10, maxStock: 50, location: 'B-04' },
      
      // Audio
      { sku: 'AUDIO-001', name: 'AirPods Pro', description: 'Auriculares inalámbricos', categoryId: categories[3].id, brand: 'Apple', unit: 'unidad', price: 249.99, cost: 179.99, stock: 50, minStock: 20, maxStock: 100, location: 'C-01' },
      { sku: 'AUDIO-002', name: 'Sony WH-1000XM5', description: 'Auriculares con cancelación de ruido', categoryId: categories[3].id, brand: 'Sony', unit: 'unidad', price: 399.99, cost: 299.99, stock: 35, minStock: 15, maxStock: 80, location: 'C-02' },
      { sku: 'AUDIO-003', name: 'JBL Flip 6', description: 'Altavoz Bluetooth portátil', categoryId: categories[3].id, brand: 'JBL', unit: 'unidad', price: 129.99, cost: 89.99, stock: 60, minStock: 25, maxStock: 120, location: 'C-03' },
      
      // Cocina
      { sku: 'COOK-001', name: 'Licuadora Oster', description: 'Licuadora de alta potencia', categoryId: categories[5].id, brand: 'Oster', unit: 'unidad', price: 79.99, cost: 49.99, stock: 40, minStock: 15, maxStock: 80, location: 'D-01' },
      { sku: 'COOK-002', name: 'Cafetera Nespresso', description: 'Máquina de café espresso', categoryId: categories[5].id, brand: 'Nespresso', unit: 'unidad', price: 199.99, cost: 139.99, stock: 28, minStock: 10, maxStock: 60, location: 'D-02' },
      { sku: 'COOK-003', name: 'Microondas Samsung', description: 'Microondas 1.1 cu ft', categoryId: categories[5].id, brand: 'Samsung', unit: 'unidad', price: 149.99, cost: 99.99, stock: 20, minStock: 8, maxStock: 40, location: 'D-03' },
      { sku: 'COOK-004', name: 'Batidora KitchenAid', description: 'Batidora de pie profesional', categoryId: categories[5].id, brand: 'KitchenAid', unit: 'unidad', price: 349.99, cost: 249.99, stock: 15, minStock: 5, maxStock: 30, location: 'D-04' },
      
      // Fitness
      { sku: 'FIT-001', name: 'Mancuernas Ajustables 20kg', description: 'Set de mancuernas', categoryId: categories[9].id, brand: 'Bowflex', unit: 'par', price: 299.99, cost: 199.99, stock: 25, minStock: 10, maxStock: 50, location: 'E-01' },
      { sku: 'FIT-002', name: 'Cinta de Correr NordicTrack', description: 'Cinta eléctrica plegable', categoryId: categories[9].id, brand: 'NordicTrack', unit: 'unidad', price: 899.99, cost: 649.99, stock: 8, minStock: 3, maxStock: 15, location: 'E-02' },
      { sku: 'FIT-003', name: 'Bicicleta Estática Peloton', description: 'Bicicleta con pantalla', categoryId: categories[9].id, brand: 'Peloton', unit: 'unidad', price: 1495.99, cost: 1099.99, stock: 5, minStock: 2, maxStock: 10, location: 'E-03' },
      { sku: 'FIT-004', name: 'Colchoneta Yoga Premium', description: 'Mat antideslizante', categoryId: categories[9].id, brand: 'Manduka', unit: 'unidad', price: 79.99, cost: 49.99, stock: 50, minStock: 20, maxStock: 100, location: 'E-04' },
      
      // Papelería
      { sku: 'PAP-001', name: 'Resma Papel A4', description: 'Papel blanco 500 hojas', categoryId: categories[13].id, brand: 'HP', unit: 'resma', price: 9.99, cost: 6.99, stock: 200, minStock: 50, maxStock: 500, location: 'F-01' },
      { sku: 'PAP-002', name: 'Bolígrafos BIC Azul', description: 'Caja 50 unidades', categoryId: categories[13].id, brand: 'BIC', unit: 'caja', price: 19.99, cost: 12.99, stock: 100, minStock: 30, maxStock: 200, location: 'F-02' },
      { sku: 'PAP-003', name: 'Cuadernos Universitarios', description: 'Pack 5 cuadernos', categoryId: categories[13].id, brand: 'Mead', unit: 'pack', price: 24.99, cost: 16.99, stock: 80, minStock: 25, maxStock: 150, location: 'F-03' },
      { sku: 'PAP-004', name: 'Marcadores Sharpie', description: 'Set 12 colores', categoryId: categories[13].id, brand: 'Sharpie', unit: 'set', price: 14.99, cost: 9.99, stock: 120, minStock: 40, maxStock: 250, location: 'F-04' },
      
      // Bebidas
      { sku: 'BEB-001', name: 'Coca-Cola 2L', description: 'Refresco de cola', categoryId: categories[17].id, brand: 'Coca-Cola', unit: 'botella', price: 2.99, cost: 1.99, stock: 300, minStock: 100, maxStock: 600, location: 'G-01' },
      { sku: 'BEB-002', name: 'Agua Mineral 500ml', description: 'Pack 24 botellas', categoryId: categories[17].id, brand: 'Evian', unit: 'pack', price: 12.99, cost: 8.99, stock: 150, minStock: 50, maxStock: 300, location: 'G-02' },
      { sku: 'BEB-003', name: 'Jugo de Naranja 1L', description: 'Jugo natural', categoryId: categories[17].id, brand: 'Tropicana', unit: 'botella', price: 4.99, cost: 3.49, stock: 180, minStock: 60, maxStock: 350, location: 'G-03' },
      { sku: 'BEB-004', name: 'Red Bull 250ml', description: 'Bebida energética', categoryId: categories[17].id, brand: 'Red Bull', unit: 'lata', price: 2.49, cost: 1.69, stock: 250, minStock: 80, maxStock: 500, location: 'G-04' },
      
      // Vitaminas
      { sku: 'VIT-001', name: 'Multivitamínico Centrum', description: '100 tabletas', categoryId: categories[21].id, brand: 'Centrum', unit: 'frasco', price: 24.99, cost: 16.99, stock: 60, minStock: 20, maxStock: 120, location: 'H-01' },
      { sku: 'VIT-002', name: 'Vitamina C 1000mg', description: '60 cápsulas', categoryId: categories[21].id, brand: 'Nature Made', unit: 'frasco', price: 14.99, cost: 9.99, stock: 80, minStock: 25, maxStock: 150, location: 'H-02' },
      { sku: 'VIT-003', name: 'Omega-3 Fish Oil', description: '120 softgels', categoryId: categories[21].id, brand: 'Nordic Naturals', unit: 'frasco', price: 29.99, cost: 19.99, stock: 50, minStock: 15, maxStock: 100, location: 'H-03' },
      { sku: 'VIT-004', name: 'Proteína Whey', description: '2kg sabor chocolate', categoryId: categories[21].id, brand: 'Optimum Nutrition', unit: 'bote', price: 49.99, cost: 34.99, stock: 35, minStock: 10, maxStock: 70, location: 'H-04' },
      
      // Herramientas
      { sku: 'TOOL-001', name: 'Taladro Inalámbrico DeWalt', description: '20V con batería', categoryId: categories[31].id, brand: 'DeWalt', unit: 'unidad', price: 149.99, cost: 99.99, stock: 30, minStock: 10, maxStock: 60, location: 'I-01' },
      { sku: 'TOOL-002', name: 'Set Destornilladores', description: '32 piezas', categoryId: categories[31].id, brand: 'Stanley', unit: 'set', price: 39.99, cost: 24.99, stock: 45, minStock: 15, maxStock: 90, location: 'I-02' },
      { sku: 'TOOL-003', name: 'Martillo de Carpintero', description: 'Mango de fibra de vidrio', categoryId: categories[31].id, brand: 'Estwing', unit: 'unidad', price: 29.99, cost: 19.99, stock: 55, minStock: 20, maxStock: 110, location: 'I-03' },
      { sku: 'TOOL-004', name: 'Caja de Herramientas', description: 'Organizador portátil', categoryId: categories[31].id, brand: 'Milwaukee', unit: 'unidad', price: 79.99, cost: 54.99, stock: 25, minStock: 10, maxStock: 50, location: 'I-04' },
    ];

    const products = [];
    for (const productData of productsData) {
      const product = await Product.create(productData);
      products.push(product);
    }
    
    console.log(`✅ ${products.length} productos creados\n`);

    // ========================================
    // SEED STOCK MOVEMENTS
    // ========================================
    console.log('📊 Creando movimientos de stock...');
    
    const movementTypes: Array<'in' | 'out' | 'adjustment' | 'transfer'> = ['in', 'out', 'adjustment', 'transfer'];
    const reasons = [
      'Compra a proveedor',
      'Venta a cliente',
      'Ajuste de inventario',
      'Transferencia entre almacenes',
      'Devolución de cliente',
      'Producto dañado',
      'Reposición de stock',
      'Inventario inicial',
    ];

    const movements = [];
    
    // Create multiple movements for each product
    for (const product of products) {
      const numMovements = Math.floor(Math.random() * 3) + 1; // 1-3 movements per product
      
      for (let i = 0; i < numMovements; i++) {
        const type = movementTypes[Math.floor(Math.random() * movementTypes.length)];
        const quantity = Math.floor(Math.random() * 20) + 1;
        const previousStock = product.stock;
        
        let newStock = previousStock;
        if (type === 'in') {
          newStock = previousStock + quantity;
        } else if (type === 'out') {
          newStock = Math.max(0, previousStock - quantity);
        } else if (type === 'adjustment') {
          newStock = previousStock + (Math.random() > 0.5 ? quantity : -quantity);
          newStock = Math.max(0, newStock);
        }
        
        const movement = await StockMovement.create({
          productId: product.id,
          type,
          quantity,
          previousStock,
          newStock,
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          reference: `REF-${Date.now()}-${i}`,
          userId: users[Math.floor(Math.random() * users.length)].id,
        });
        
        movements.push(movement);
      }
    }
    
    console.log(`✅ ${movements.length} movimientos de stock creados\n`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log('=' .repeat(80));
    console.log('🎉 SEED COMPLETADO EXITOSAMENTE');
    console.log('=' .repeat(80));
    console.log(`\n📊 Resumen:`);
    console.log(`   • Usuarios: ${users.length}`);
    console.log(`   • Categorías: ${categories.length}`);
    console.log(`   • Productos: ${products.length}`);
    console.log(`   • Movimientos de Stock: ${movements.length}`);
    console.log(`\n💡 Puedes usar cualquiera de los usuarios listados arriba para iniciar sesión`);
    console.log(`   Ejemplo: admin@inventory.com / Admin123!\n`);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run seed
seedDatabase()
  .then(() => {
    console.log('✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
