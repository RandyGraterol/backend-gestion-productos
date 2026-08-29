#!/bin/sh
set -e

echo "🐳 InventarioApp Backend - Entrypoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ============================================
# 1. Wait for PostgreSQL to be ready
# ============================================
if [ "$DB_DIALECT" = "postgres" ]; then
  echo "⏳ Waiting for PostgreSQL at ${DB_HOST:-localhost}:${DB_PORT:-5432}..."
  
  # Use node to wait for postgres (more reliable than pg_isready in alpine)
  node -e "
    const net = require('net');
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '5432', 10);
    const maxAttempts = 30;
    let attempts = 0;

    function tryConnect() {
      attempts++;
      const socket = net.createConnection(port, host);
      socket.on('connect', () => {
        console.log('✅ PostgreSQL is ready!');
        socket.destroy();
        process.exit(0);
      });
      socket.on('error', () => {
        socket.destroy();
        if (attempts >= maxAttempts) {
          console.error('❌ Could not connect to PostgreSQL after ' + maxAttempts + ' attempts');
          process.exit(1);
        }
        console.log('  Attempt ' + attempts + '/' + maxAttempts + ' - waiting 2s...');
        setTimeout(tryConnect, 2000);
      });
    }
    tryConnect();
  "
fi

# ============================================
# 2. Apply critical schema fixes (SQL directly)
# ============================================
echo ""
echo "🔧 Applying critical schema fixes..."
node -e "
  const { Sequelize } = require('sequelize');
  const seq = new Sequelize(
    process.env.DB_NAME || 'inventario_db',
    process.env.DB_USER || 'inventario_user',
    process.env.DB_PASSWORD || 'inventario_secure_2026',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      dialect: 'postgres',
      logging: false,
    }
  );

  const fixes = [
    // Drop NOT NULL from legacy columns in stock_movements
    'ALTER TABLE \"stock_movements\" ALTER COLUMN \"productId\" DROP NOT NULL',
    'ALTER TABLE \"stock_movements\" ALTER COLUMN \"quantity\" DROP NOT NULL',
    'ALTER TABLE \"stock_movements\" ALTER COLUMN \"previousStock\" DROP NOT NULL',
    'ALTER TABLE \"stock_movements\" ALTER COLUMN \"newStock\" DROP NOT NULL',
    // Drop legacy foreign key
    'ALTER TABLE \"stock_movements\" DROP CONSTRAINT IF EXISTS \"stock_movements_productId_fkey\"',
  ];

  (async () => {
    try {
      await seq.authenticate();
      console.log('  ✅ Connected to PostgreSQL');

      for (const sql of fixes) {
        try {
          await seq.query(sql);
          const col = sql.match(/\"(\w+)\"/g);
          console.log('  ✓ Applied: ' + (col ? col[col.length - 1] : sql.substring(0, 50)));
        } catch (e) {
          // Column may not exist or already nullable - that's fine
          if (e.parent && e.parent.code === '42703') {
            // column does not exist
          } else if (e.parent && e.parent.code === '42P01') {
            // relation does not exist
          } else {
            console.log('  ⏭ Skipped (already applied): ' + (e.parent ? e.parent.message : e.message).substring(0, 80));
          }
        }
      }
      console.log('  ✅ Schema fixes applied');
      await seq.close();
    } catch (e) {
      console.error('  ⚠️  Schema fix connection error:', e.message);
      await seq.close();
    }
  })();
"

# ============================================
# 3. Run all migrations
# ============================================
echo ""
echo "🔄 Running database migrations..."
set +e  # Temporarily disable exit-on-error for migrations
node dist/scripts/run-all-migrations.js
MIGRATION_EXIT=$?
set -e  # Re-enable exit-on-error

if [ $MIGRATION_EXIT -ne 0 ]; then
  echo "⚠️  Some migrations failed (exit code: $MIGRATION_EXIT), but continuing startup..."
fi

echo ""

# ============================================
# 4. Fix upload directory permissions (runs as root)
# ============================================
echo ""
echo "📁 Fixing upload directory permissions..."
mkdir -p /app/uploads/products /app/uploads/apk /app/uploads/donations /app/uploads/temp
chown -R appuser:appgroup /app/uploads
chmod -R 755 /app/uploads
echo "  ✅ Upload directories ready"

# ============================================
# 5. Start the application as appuser (drop privileges)
# ============================================
echo "🚀 Starting application..."
exec su-exec appuser "$@"
