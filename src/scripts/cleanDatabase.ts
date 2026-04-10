import { sequelize } from '../config/database';
import {
  Category,
  Product,
  StockMovement,
  ProductImage,
  Notification
} from '../models';

const cleanDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('🔗 Database connected.');

    console.log('🧹 Starting database cleanup (keeping users)...');

    // Temporarily turn off foreign key checks for safer full deletion
    await sequelize.query('PRAGMA foreign_keys = OFF;');

    // 1. Delete Notifications
    const deletedNotifications = await Notification.destroy({ where: {} });
    console.log(`✅ Deleted ${deletedNotifications} notifications.`);

    // 2. Delete StockMovements
    const deletedMovements = await StockMovement.destroy({ where: {} });
    console.log(`✅ Deleted ${deletedMovements} stock movements.`);

    // 3. Delete ProductImages
    const deletedImages = await ProductImage.destroy({ where: {} });
    console.log(`✅ Deleted ${deletedImages} product images.`);

    // 4. Delete Products
    const deletedProducts = await Product.destroy({ where: {} });
    console.log(`✅ Deleted ${deletedProducts} products.`);

    // 5. Delete Categories (self-referential)
    const deletedCategories = await Category.destroy({ where: {} });
    console.log(`✅ Deleted ${deletedCategories} categories.`);

    // Restore foreign key checks
    await sequelize.query('PRAGMA foreign_keys = ON;');

    console.log('\n🎉 Database cleanup completed successfully! Users have been preserved.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    process.exit(1);
  }
};

cleanDatabase();
