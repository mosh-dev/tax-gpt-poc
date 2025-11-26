# ================================
# Stage 1: Builder
# ================================
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies for canvas & other native packages
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./
COPY tsconfig.json ./
COPY esbuild.config.mjs ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript for INB server (NODE_ENV=inb with minification)
RUN npm run server:build:inb



# ================================
# Stage 2: Production
# ================================
FROM node:22-slim AS production

WORKDIR /app

# Install runtime dependencies for canvas & sharp
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

# Copy only package.json
COPY package.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built output from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Create root storage directory (subdirs created by app at startup)
RUN mkdir -p /storage && \
    chown -R nodejs:nodejs /storage

# Fix permissions
RUN chown -R nodejs:nodejs /app

# Switch to restricted user
USER nodejs

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "server:start"]
