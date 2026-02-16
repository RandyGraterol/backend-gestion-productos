/**
 * Post-build script
 * Ensures necessary directories exist after compilation
 */

const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/products');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
} else {
  console.log('✓ Uploads directory already exists:', uploadsDir);
}

// Create database directory if it doesn't exist
const databaseDir = path.join(__dirname, '../database');

if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
  console.log('✅ Created database directory:', databaseDir);
} else {
  console.log('✓ Database directory already exists:', databaseDir);
}

console.log('✅ Post-build setup complete');
