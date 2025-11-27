# ================================
# Stage 1: Builder
# ================================
FROM node:24-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./
COPY esbuild.config.mjs ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript for INB server
RUN npm run server:build:inb


# ================================
# Stage 2: Production
# ================================
FROM node:24-slim AS production

WORKDIR /app

# Copy package.json only
COPY package.json ./

# Copy built output and node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Remove dev dependencies
RUN npm prune --omit=dev

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Create storage directory
RUN mkdir -p /storage && \
    chown -R nodejs:nodejs /storage

# Fix ownership for app
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

EXPOSE 3000

CMD ["npm", "run", "server:start"]
