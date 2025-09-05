"""
Enhanced Containerization Service
Generates optimized Dockerfiles and Docker Compose files based on project analysis
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from app.core.logging import get_logger
from app.services.project_analyzer import ProjectAnalysis, ProjectType
from app.schemas.deployment import ContainerizationRequest

logger = get_logger(__name__)

class ContainerizationService:
    """Service for generating Docker configurations"""
    
    def __init__(self):
        self.dockerfile_templates = {
            "react": self._generate_react_dockerfile,
            "vue": self._generate_vue_dockerfile,
            "angular": self._generate_angular_dockerfile,
            "nextjs": self._generate_nextjs_dockerfile,
            "nuxt": self._generate_nuxt_dockerfile,
            "svelte": self._generate_svelte_dockerfile,
            "python": self._generate_python_dockerfile,
            "java": self._generate_java_dockerfile,
            "go": self._generate_go_dockerfile,
            "rust": self._generate_rust_dockerfile,
            "php": self._generate_php_dockerfile,
            "static": self._generate_static_dockerfile
        }
    
    async def containerize_project(self, project_analysis: ProjectAnalysis, project_path: str) -> Dict[str, Any]:
        """
        Containerize a project based on analysis results
        
        Args:
            project_analysis: Analysis results from ProjectAnalyzer
            project_path: Path to the project directory
            
        Returns:
            Dictionary containing Docker configuration files
        """
        try:
            logger.info(f"Containerizing {project_analysis.project_type.value} project")
            
            # Generate Dockerfile
            dockerfile_content = await self._generate_dockerfile(project_analysis, project_path)
            
            # Generate Docker Compose
            docker_compose_content = await self._generate_docker_compose(project_analysis)
            
            # Generate .dockerignore
            dockerignore_content = await self._generate_dockerignore(project_analysis)
            
            # Generate docker-compose.prod.yml for production
            docker_compose_prod_content = await self._generate_docker_compose_prod(project_analysis)
            
            return {
                "dockerfile": dockerfile_content,
                "docker_compose": docker_compose_content,
                "docker_compose_prod": docker_compose_prod_content,
                "dockerignore": dockerignore_content,
                "image_name": f"{project_analysis.project_type.value}-app:latest",
                "port": project_analysis.port,
                "base_image": project_analysis.base_image,
                "strategy": project_analysis.dockerfile_strategy
            }
            
        except Exception as e:
            logger.error(f"Containerization failed: {e}")
            raise
    
    async def _generate_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate Dockerfile based on project analysis"""
        project_type = analysis.project_type.value
        
        if project_type in self.dockerfile_templates:
            return self.dockerfile_templates[project_type](analysis, project_path)
        else:
            return self._generate_generic_dockerfile(analysis)
    
    def _generate_react_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized React Dockerfile"""
        return f"""# Multi-stage build for React app
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE {analysis.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
"""
    
    def _generate_vue_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized Vue.js Dockerfile"""
        return f"""# Multi-stage build for Vue.js app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE {analysis.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
"""
    
    def _generate_angular_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized Angular Dockerfile"""
        return f"""# Multi-stage build for Angular app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the app
RUN npm run build --prod

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE {analysis.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
"""
    
    def _generate_nextjs_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized Next.js Dockerfile"""
        return f"""# Multi-stage build for Next.js app
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the app
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE {analysis.port}

ENV PORT {analysis.port}
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/api/health || exit 1

CMD ["node", "server.js"]
"""
    
    def _generate_nuxt_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized Nuxt.js Dockerfile"""
        return f"""# Multi-stage build for Nuxt.js app
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the app
RUN npm run build

# Production image, copy all the files and run nuxt
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nuxtjs

COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output

USER nuxtjs

EXPOSE {analysis.port}

ENV PORT {analysis.port}
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/ || exit 1

CMD ["node", ".output/server/index.mjs"]
"""
    
    def _generate_svelte_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized Svelte Dockerfile"""
        return f"""# Multi-stage build for Svelte app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE {analysis.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
"""
    
    def _generate_python_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized Python Dockerfile"""
        return f"""# Multi-stage build for Python app
FROM python:3.11-slim AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY . .

# Set environment variables
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

# Expose port
EXPOSE {analysis.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/health || exit 1

# Run the application
CMD ["python", "main.py"]
"""
    
    def _generate_java_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized Java Dockerfile"""
        return f"""# Multi-stage build for Java app
FROM openjdk:17-jdk-slim AS builder

WORKDIR /app

# Copy build files
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Production stage
FROM openjdk:17-jre-slim

WORKDIR /app

# Copy the built jar
COPY --from=builder /app/target/*.jar app.jar

# Expose port
EXPOSE {analysis.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/actuator/health || exit 1

# Run the application
CMD ["java", "-jar", "app.jar"]
"""
    
    def _generate_go_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized Go Dockerfile"""
        return f"""# Multi-stage build for Go app
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy the binary
COPY --from=builder /app/main .

# Expose port
EXPOSE {analysis.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/health || exit 1

# Run the application
CMD ["./main"]
"""
    
    def _generate_rust_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized Rust Dockerfile"""
        return f"""# Multi-stage build for Rust app
FROM rust:1.75-slim AS builder

WORKDIR /app

# Copy Cargo files
COPY Cargo.toml Cargo.lock ./

# Build dependencies
RUN cargo build --release

# Copy source code
COPY src ./src

# Build the application
RUN cargo build --release

# Production stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \\
    ca-certificates \\
    && rm -rf /var/lib/apt/lists/*

# Copy the binary
COPY --from=builder /app/target/release/app .

# Expose port
EXPOSE {analysis.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/health || exit 1

# Run the application
CMD ["./app"]
"""
    
    def _generate_php_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized PHP Dockerfile"""
        return f"""# Multi-stage build for PHP app
FROM php:8.2-fpm-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \\
    nginx \\
    supervisor

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql

# Copy application code
COPY . .

# Install Composer dependencies
COPY composer.json composer.lock ./
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN composer install --no-dev --optimize-autoloader

# Production stage
FROM php:8.2-fpm-alpine

WORKDIR /app

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

# Copy application code
COPY --from=builder /app .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port
EXPOSE {analysis.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/ || exit 1

# Start services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
"""
    
    def _generate_static_dockerfile(self, analysis: ProjectAnalysis, project_path: str) -> str:
        """Generate optimized static site Dockerfile"""
        return f"""# Static site Dockerfile
FROM nginx:alpine

# Copy static files
COPY . /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE {analysis.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
"""
    
    def _generate_generic_dockerfile(self, analysis: ProjectAnalysis) -> str:
        """Generate a generic Dockerfile for unknown project types"""
        return f"""# Generic Dockerfile
FROM {analysis.base_image}

WORKDIR /app

# Copy application code
COPY . .

# Expose port
EXPOSE {analysis.port}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:{analysis.port}/ || exit 1

# Run the application
CMD ["echo", "Please configure your application startup command"]
"""
    
    async def _generate_docker_compose(self, analysis: ProjectAnalysis) -> str:
        """Generate Docker Compose file for development"""
        return f"""version: '3.8'

services:
  app:
    build: .
    ports:
      - "{analysis.port}:{analysis.port}"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:{analysis.port}/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  default:
    name: {analysis.project_type.value}-network
"""
    
    async def _generate_docker_compose_prod(self, analysis: ProjectAnalysis) -> str:
        """Generate Docker Compose file for production"""
        return f"""version: '3.8'

services:
  app:
    build: .
    ports:
      - "{analysis.port}:{analysis.port}"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:{analysis.port}/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

networks:
  default:
    name: {analysis.project_type.value}-prod-network
"""
    
    async def _generate_dockerignore(self, analysis: ProjectAnalysis) -> str:
        """Generate .dockerignore file"""
        return f"""# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist/
build/
.next/
.nuxt/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Docker
Dockerfile*
docker-compose*
.dockerignore

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port
"""
