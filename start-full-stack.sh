#!/bin/bash

echo "🚀 Starting DeployHub Full Stack..."
echo "=================================="
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping all servers..."
    pkill -f "node.*local-server"
    pkill -f "vite"
    echo "✅ All servers stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

echo "🔧 Building backend TypeScript..."
cd src/backend && npm run build
cd ../..

echo "🚀 Starting backend server on port 3001..."
cd src/backend && npm run start &
BACKEND_PID=$!
cd ../..

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend server started successfully"
    echo "📝 Deploy endpoint: http://localhost:3001/deploy-s3"
    echo "❤️  Health check: http://localhost:3001/health"
else
    echo "❌ Backend server failed to start"
    exit 1
fi

echo ""
echo "🚀 Starting frontend development server on port 8080..."
echo "🌐 Frontend URL: http://localhost:8080"
echo ""

# Start frontend (ensure we're in the right directory)
cd /home/zohra-bouchamaoui/Desktop/vibe-deploy-bridge
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Full stack started successfully!"
echo "=================================="
echo "🌐 Frontend: http://localhost:8080"
echo "🔧 Backend: http://localhost:3001"
echo "📝 Deploy API: http://localhost:3001/deploy-s3"
echo "❤️  Health: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
