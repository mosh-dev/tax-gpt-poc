# ================================
# Stage 1: Builder
# ================================
FROM node:24-alpine AS builder

WORKDIR /app

# No system packages needed for @napi-rs/canvas

# Copy package files
COPY package.json ./
COPY tsconfig.json ./
COPY esbuild.config.mjs ./

# Install dependencies
RUN npm install

# Copy source
COPY src ./src

# Build TypeScript for INB server
RUN npm run server:build:inb



# ================================
# Stage 2: Production
# ================================
FROM node:24-alpine AS production

WORKDIR /app

# @napi-rs/canvas requires ZERO system-level libs
# Node 24 Slim is fully compatible out of the box.

# Copy package.json and built output
COPY package.json ./
COPY --from=builder /app/dist ./dist

# Copy node_modules (already built)
COPY --from=builder /app/node_modules ./node_modules

# Remove dev deps
RUN npm prune --omit=dev

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Create storage directory
RUN mkdir -p /storage && \
    chown -R nodejs:nodejs /storage

# Fix ownership for app
RUN chown -R nodejs:nodejs /app

# Switch user
USER nodejs

EXPOSE 3000

CMD ["npm", "run", "server:start"]
