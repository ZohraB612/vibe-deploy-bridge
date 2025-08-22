# 🐳 Docker Setup for DeployHub

This guide explains how to run DeployHub using Docker for both development and production environments.

## 📋 Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

## 🚀 Quick Start

### Development Mode
```bash
# Start development environment with hot reload
./scripts/docker-dev.sh

# Or manually:
docker-compose --profile dev up frontend-dev
```

### Production Mode
```bash
# Build and start production container
./scripts/docker-build.sh
docker-compose up frontend

# Or in detached mode:
docker-compose up -d frontend
```

## 📁 Docker Configuration Files

```
├── Dockerfile              # Production build (multi-stage)
├── Dockerfile.dev          # Development build
├── docker-compose.yml      # Service orchestration
├── nginx.conf              # Production nginx config
├── .dockerignore           # Files to exclude from build
└── scripts/
    ├── docker-build.sh     # Build script
    └── docker-dev.sh       # Development script
```

## 🛠️ Available Services

### Current Services
- **frontend** (production): Nginx serving built React app on port 3000
- **frontend-dev** (development): Vite dev server with HMR on port 8080

### Future Services (Placeholders)
- **backend**: Node.js API server (port 3001)
- **postgres**: PostgreSQL database
- **redis**: Redis cache

## 🔧 Development Commands

```bash
# Start development environment
docker-compose --profile dev up frontend-dev

# Rebuild development image
docker-compose --profile dev build frontend-dev

# View logs
docker-compose --profile dev logs -f frontend-dev

# Stop development environment
docker-compose --profile dev down
```

## 🚀 Production Commands

```bash
# Build production image
docker build -t deployhub:latest .

# Start production container
docker-compose up -d frontend

# View production logs
docker-compose logs -f frontend

# Stop production container
docker-compose down
```

## 🌐 Access URLs

- **Development**: http://localhost:8080
- **Production**: http://localhost:3000
- **Health Check**: http://localhost:3000/health (production only)

## 📊 Container Health Checks

Both containers include health checks:
- **Development**: Checks Vite dev server
- **Production**: Checks Nginx server

View health status:
```bash
docker ps
```

## 🔄 Environment Variables

Copy and configure environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

## 🎯 Production Features

### Security Headers
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Content-Security-Policy
- Referrer-Policy

### Performance Optimizations
- Gzip compression
- Static asset caching
- Nginx optimizations
- Multi-stage Docker build

### Monitoring
- Health check endpoints
- Container health monitoring
- Nginx access logs

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using the port
   lsof -i :8080
   # Kill the process or change port in docker-compose.yml
   ```

2. **Permission denied on scripts**
   ```bash
   chmod +x scripts/*.sh
   ```

3. **Docker build fails**
   ```bash
   # Clean Docker cache
   docker system prune -a
   # Rebuild without cache
   docker build --no-cache -t deployhub:latest .
   ```

4. **Container won't start**
   ```bash
   # Check logs
   docker-compose logs frontend
   # Check container status
   docker ps -a
   ```

## 🔮 Future Enhancements

When backend is implemented:
```bash
# Start full stack
docker-compose up -d

# Services will include:
# - Frontend (React + Nginx)
# - Backend (Node.js + Express)
# - Database (PostgreSQL)
# - Cache (Redis)
```

## 📝 Notes

- Development container mounts source code for hot reload
- Production container serves optimized static build
- All containers use Alpine Linux for smaller image size
- Health checks ensure container reliability
- Ready for Kubernetes deployment with minimal changes
