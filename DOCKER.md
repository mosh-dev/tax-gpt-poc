# Docker Setup for Tax-GPT

This guide explains how to run Tax-GPT using Docker with separate client and server containers.

## Architecture

The application is split into two Docker services:

- **Client (Angular + Nginx)**: Serves the frontend on port 80
- **Server (Node.js/Express)**: Provides the API on port 3000 (internal)

The nginx reverse proxy in the client container routes API requests to the server.

## Prerequisites

1. **Docker** installed on your system
   - [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
   - [Docker for Linux](https://docs.docker.com/engine/install/)
   - [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)

2. **LMStudio** running on your host machine
   - Download from [lmstudio.ai](https://lmstudio.ai/)
   - Load the `openai/gpt-oss-20b` model (or your preferred model)
   - Start the local server (default port: 1234)

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file and update it with your settings:

```bash
cp .env.example .env
```

Edit `.env` and set your LMStudio URL:

```env
LMSTUDIO_URL=http://host.docker.internal:1234
LMSTUDIO_MODEL=openai/gpt-oss-20b
NODE_ENV=production
PORT=3000
```

**Note for Windows/Mac:** `host.docker.internal` automatically resolves to your host machine's IP address, allowing the Docker container to access LMStudio running on your host.

**Note for Linux:** You may need to use your actual IP address instead:
```env
LMSTUDIO_URL=http://192.168.1.100:1234
```

### 2. Build and Run with Docker Compose

```bash
docker-compose up --build
```

This will:
- Build the client Docker image (Angular + Nginx)
- Build the server Docker image (Node.js + Express)
- Start both containers with networking
- Expose the application on port 80

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost
```

The nginx proxy will serve the Angular frontend and route API requests to the backend server.

## Manual Docker Commands

If you prefer to build and run containers individually:

### Build Images

```bash
# Build client image
cd client
docker build -t tax-gpt-client .

# Build server image
cd ../server
docker build -t tax-gpt-server .
```

### Create Network

```bash
docker network create tax-gpt-network
```

### Run Containers

```bash
# Run server container
docker run -d \
  --name tax-gpt-server \
  --network tax-gpt-network \
  -e NODE_ENV=production \
  -e LMSTUDIO_URL=http://host.docker.internal:1234 \
  -e LMSTUDIO_MODEL=openai/gpt-oss-20b \
  tax-gpt-server

# Run client container
docker run -d \
  --name tax-gpt-client \
  --network tax-gpt-network \
  -p 80:80 \
  tax-gpt-client
```

## Docker Architecture

### Separate Service Architecture

The application uses a microservices approach with two containers:

#### Client Container (`client/Dockerfile`)
1. **Stage 1: Build**
   - Node.js 20 Alpine
   - Installs dependencies and builds Angular app
   - Output: `dist/client/browser`

2. **Stage 2: Nginx Server**
   - Nginx Alpine
   - Serves static Angular files
   - Reverse proxy for `/api` and `/downloads` routes
   - Configured with gzip compression and caching

#### Server Container (`server/Dockerfile`)
1. **Stage 1: Build**
   - Node.js 20 Alpine
   - Compiles TypeScript to JavaScript
   - Output: `dist/`

2. **Stage 2: Production Runtime**
   - Minimal Node.js 20 Alpine
   - Production dependencies only
   - Runs as non-root user (nodejs:1001)
   - Exposes port 3000 (internal only)

### Container Structure

**Client Container:**
```
/usr/share/nginx/html/     # Angular build output
├── index.html
├── main.*.js
├── polyfills.*.js
└── ...

/etc/nginx/conf.d/
└── default.conf           # Nginx configuration
```

**Server Container:**
```
/app/
├── dist/                  # Compiled server code
│   └── index.js
├── generated-pdfs/        # PDF storage (volume)
├── node_modules/          # Production dependencies
└── package.json
```

### Service Communication

- Client (nginx) proxies requests to server via internal Docker network
- Server hostname: `server` (resolved by Docker DNS)
- Client exposed on host port 80
- Server only accessible within Docker network (secure)

## Endpoints

When running, the application provides:

- **Frontend (SPA):** `http://localhost/`
- **API Endpoints:** `http://localhost/api/*` (proxied to server)
- **Health Check:** `http://localhost/api/health`
- **PDF Downloads:** `http://localhost/downloads/*` (proxied to server)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `3000` |
| `LMSTUDIO_URL` | LMStudio server URL | `http://host.docker.internal:1234` |
| `LMSTUDIO_MODEL` | LLM model name | `openai/gpt-oss-20b` |

## Health Check

Both containers include health checks that run every 30 seconds:

```bash
docker ps
```

Look for `healthy` status in the STATUS column for both containers.

You can also manually check health:

```bash
# Check frontend (nginx)
curl http://localhost/

# Check backend API (through nginx proxy)
curl http://localhost/api/health
```

## Troubleshooting

### Container can't connect to LMStudio

**Symptoms:** 500 errors, "Connection refused" in logs

**Solutions:**
1. Ensure LMStudio is running on your host machine
2. Check that LMStudio server is started (port 1234)
3. **Windows/Mac:** Use `host.docker.internal` in `LMSTUDIO_URL`
4. **Linux:** Use your actual IP address (e.g., `192.168.1.100`)
5. Check firewall settings

To find your IP address:
```bash
# Linux/Mac
ifconfig | grep "inet "

# Windows
ipconfig
```

### Port 80 already in use

```bash
# Find what's using port 80
# Windows
netstat -ano | findstr :80

# Linux/Mac
lsof -i :80

# Change the port in docker-compose.yml:
# ports:
#   - "8080:80"  # Use port 8080 instead

# Then access at http://localhost:8080
```

### View Container Logs

```bash
# View all services
docker-compose logs

# View specific service
docker-compose logs server
docker-compose logs client

# Follow logs in real-time
docker-compose logs -f

# Follow specific service
docker-compose logs -f server
```

### Rebuild After Code Changes

```bash
docker-compose down
docker-compose up --build
```

### Clean Build (No Cache)

```bash
docker-compose build --no-cache
docker-compose up
```

## Production Deployment

For production deployment on a server:

### Using Docker Compose

```bash
# Pull latest code
git pull

# Build and start in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f
```

### Using Docker Directly

```bash
# Build
docker build -t tax-gpt:latest .

# Run in background
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e LMSTUDIO_URL=http://your-lmstudio-server:1234 \
  --name tax-gpt \
  --restart unless-stopped \
  tax-gpt:latest
```

### Environment File for Production

Create a `.env.production` file:

```env
NODE_ENV=production
PORT=3000
LMSTUDIO_URL=http://your-production-lmstudio:1234
LMSTUDIO_MODEL=openai/gpt-oss-20b
```

Use it with docker-compose:

```bash
docker-compose --env-file .env.production up -d
```

## Stopping the Application

```bash
# With docker-compose (stops all services)
docker-compose down

# With docker directly
docker stop tax-gpt-client tax-gpt-server
docker rm tax-gpt-client tax-gpt-server

# Remove volume (will delete generated PDFs)
docker volume rm tax-gpt_pdf-data
```

## Useful Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Enter container shell
docker exec -it tax-gpt-server sh    # Server container
docker exec -it tax-gpt-client sh    # Client container

# View resource usage
docker stats

# Check service health
docker-compose ps

# Restart specific service
docker-compose restart server
docker-compose restart client

# View volumes
docker volume ls

# Inspect volume
docker volume inspect tax-gpt_pdf-data

# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove everything (containers, networks, volumes, images)
docker-compose down -v
docker system prune -a
```

## Development vs Production

| Feature | Development | Production (Docker) |
|---------|-------------|---------------------|
| Architecture | Monolithic | Microservices (2 containers) |
| Angular | Dev server (4200) | Nginx (port 80) |
| Server | Express (3000) | Express (3000, internal) |
| Reverse Proxy | None | Nginx |
| Hot Reload | Yes | No |
| CORS | Enabled | Not needed (same origin via proxy) |
| Build Size | Large (dev deps) | Small (prod deps, multi-stage) |
| Security | Development mode | Non-root users, minimal images |
| Data Persistence | Local filesystem | Docker volumes |

## Next Steps

- Set up reverse proxy (nginx) for HTTPS
- Configure environment-specific settings
- Set up automated backups for generated PDFs
- Implement log aggregation
- Set up monitoring and alerts