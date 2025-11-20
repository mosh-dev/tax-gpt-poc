# -------------------------------------------------------------
# BUILDER — optimized with cache mounts
# -------------------------------------------------------------
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies needed to build canvas
RUN --mount=type=cache,target=/var/cache/apt,sharing=shared \
    apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      pkg-config \
      build-essential \
      libcairo2-dev \
      libpango1.0-dev \
      libjpeg-dev \
      libgif-dev \
      librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# copy dependency files first (better caching)
COPY package.json package-lock.json ./
COPY tsconfig.json ./

# npm install with cache → very fast
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# copy source
COPY src ./src

# build app
RUN npm run build


# -------------------------------------------------------------
# PRODUCTION IMAGE — lightweight & fast
# -------------------------------------------------------------
FROM node:22-slim AS production
WORKDIR /app

# Only runtime deps (no dev tools)
RUN --mount=type=cache,target=/var/cache/apt,sharing=shared \
    apt-get update && apt-get install -y --no-install-recommends \
        libcairo2 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libjpeg62-turbo \
        libgif7 \
        librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# Fast install of production deps
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline

COPY --from=builder /app/dist ./dist

RUN mkdir -p storage/files storage/temp storage/tesseract-lang

# non-root user
# RUN useradd -u 1001 -m -U nodejs && chown -R nodejs:nodejs /app
# USER nodejs

EXPOSE 3000

# HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
#   CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]
