# JadeAssist Backend Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=packages/backend --workspace=packages/shared

# Copy source code
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install production dependencies only
RUN npm ci --workspace=packages/backend --workspace=packages/shared --omit=dev

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "packages/backend/dist/index.js"]
