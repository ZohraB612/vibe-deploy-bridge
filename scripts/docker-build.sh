#!/bin/bash

# Docker build script for DeployHub

set -e

echo "🐳 Building DeployHub Docker containers..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Build production image
echo -e "${BLUE}Building production image...${NC}"
docker build -t deployhub:latest -t deployhub:prod .

# Build development image
echo -e "${BLUE}Building development image...${NC}"
docker build -f Dockerfile.dev -t deployhub:dev .

# Show images
echo -e "${GREEN}✅ Build complete! Images created:${NC}"
docker images | grep deployhub

echo -e "${YELLOW}📋 Available commands:${NC}"
echo "  • Production:   docker-compose up frontend"
echo "  • Development:  docker-compose --profile dev up frontend-dev"
echo "  • All services: docker-compose up -d"

echo -e "${GREEN}🚀 Ready to deploy!${NC}"
