# Frontend Dockerfile - React + Vite + Nginx

# Stage 1: Build React App
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependenciesan
RUN npm install

# Copy source code and config files
COPY . .

# Build the React app (Vite will inject VITE_AGENT_SERVER_URL from .env.inb)
RUN npm run client:build:inb

# Stage 2: Production - Nginx
FROM nginx:alpine

# Copy built React app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
