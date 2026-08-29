#!/bin/sh
# Fix: make stock_movements.productId nullable
# Run this on the database directly

echo "Fixing stock_movements.productId NOT NULL constraint..."

docker exec inventario-postgres psql -U postgres -d inventario -c \
  "ALTER TABLE stock_movements ALTER COLUMN \"productId\" DROP NOT NULL;"

echo "Done! Verify with:"
docker exec inventario-postgres psql -U postgres -d inventario -c \
  "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='productId';"
