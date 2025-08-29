#!/bin/bash

echo "🚀 Starting DeployHub Backend Server..."
echo "📁 Backend directory: src/backend"
echo "🔧 Building TypeScript..."
cd src/backend && npm run build

echo "🚀 Starting server on port 3001..."
echo "📝 Deploy endpoint: http://localhost:3001/deploy-s3"
echo "❤️  Health check: http://localhost:3001/health"
echo "🌐 Server bound to all interfaces (IPv4 + IPv6)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run start
