#!/bin/sh
set -e

echo "🐳 InventarioApp Backend - Development Entrypoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ============================================
# 1. Wait for PostgreSQL to be ready
# ============================================
if [ "$DB_DIALECT" = "postgres" ]; then
  echo "⏳ Waiting for PostgreSQL at ${DB_HOST:-localhost}:${DB_PORT:-5432}..."
  
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
# 2. Run all migrations (using ts-node for dev)
# ============================================
echo ""
echo "🔄 Running database migrations (ts-node)..."
set +e  # Temporarily disable exit-on-error for migrations
npx ts-node src/scripts/run-all-migrations.ts
MIGRATION_EXIT=$?
set -e  # Re-enable exit-on-error

if [ $MIGRATION_EXIT -ne 0 ]; then
  echo "⚠️  Some migrations failed (exit code: $MIGRATION_EXIT), but continuing startup..."
fi

echo ""

# ============================================
# 3. Start the application
# ============================================
echo "🚀 Starting development server..."
exec "$@"
