import { sequelize } from '../config/database';
import { Product, ProductImage } from '../models';

async function checkImages() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Count products with images
    const productsWithImages = await Product.findAll({
      include: [
        {
          model: ProductImage,
          as: 'images',
          required: true,
        },
      ],
    });

    console.log(`\nProducts with images: ${productsWithImages.length}`);

    if (productsWithImages.length > 0) {
      console.log('\nProducts with images:');
      productsWithImages.forEach((product: any) => {
        const images = product.images || [];
        console.log(`- ${product.name} (${product.sku}): ${images.length} images`);
        images.forEach((img: any) => {
          console.log(`  * ${img.fileName} (Primary: ${img.isPrimary})`);
        });
      });
    }

    // Count all images
    const totalImages = await ProductImage.count();
    console.log(`\nTotal images in database: ${totalImages}`);

    // Show all images
    if (totalImages > 0) {
      const allImages = await ProductImage.findAll({
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['name', 'sku'],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      console.log('\nAll images:');
      allImages.forEach((img: any) => {
        const productName = img.product?.name || 'Unknown';
        console.log(
          `- ${img.fileName} -> ${productName} (Primary: ${img.isPrimary}, Order: ${img.displayOrder})`
        );
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkImages();
