# Frontend Dockerfile - React + Vite + Nginx

# Stage 1: Build React App
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Copy source code and config files
COPY . .

# Build the React app
RUN npm install
RUN npm run build

# Stage 2: Production - Nginx
FROM nginx:alpine

# Copy built React app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
