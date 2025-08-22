#!/bin/bash

# Development environment script

set -e

echo "🛠️ Starting DeployHub development environment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start development container
echo -e "${BLUE}Building development image...${NC}"
docker-compose --profile dev build frontend-dev

echo -e "${BLUE}Starting development server...${NC}"
docker-compose --profile dev up frontend-dev

echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo -e "${YELLOW}Access your app at: http://localhost:8080${NC}"
