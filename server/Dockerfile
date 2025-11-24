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

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build



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

# Create centralized storage directories
RUN mkdir -p storage/files \
             storage/temp \
             storage/tesseract-lang

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Fix permissions
RUN chown -R nodejs:nodejs /app

# Switch to restricted user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]
