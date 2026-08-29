# ============================================
# InventarioApp Backend - Dockerfile
# Multi-stage build for production
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript (only tsc, post-build dirs created in production stage)
RUN npx tsc

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init + su-exec for proper signal handling and user switching
RUN apk add --no-cache dumb-init su-exec

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy assets (images, etc.) from source
COPY --from=builder /app/src/assets ./dist/assets

# Create necessary directories and set ownership
RUN mkdir -p uploads/products uploads/apk uploads/donations uploads/temp backups logs database && \
    chown -R appuser:appgroup /app

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# NOTE: Do NOT use USER appuser here — entrypoint runs as root to fix
# volume permissions, then drops to appuser via su-exec before starting the app

# Expose port
EXPOSE 3010

# Health check — use node since wget --spider isn't reliable in Alpine
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.get('http://localhost:3010/health', r => { process.exit(r.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end()"

# Start application: run migrations then start server
ENTRYPOINT ["dumb-init", "--", "./entrypoint.sh"]
CMD ["node", "dist/server.js"]
