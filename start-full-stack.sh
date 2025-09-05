#!/bin/bash

echo "🚀 Starting DeployHub Full Stack..."
echo "=================================="
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping all servers..."
    pkill -f "uvicorn"
    pkill -f "python.*start_server"
    pkill -f "vite"
    echo "✅ All servers stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

echo "🔧 Setting up FastAPI backend..."
cd backend_fastapi

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

echo "🚀 Starting FastAPI backend server on port 3001..."
python start_server.py &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ FastAPI backend server started successfully"
    echo "📝 API Documentation: http://localhost:3001/docs"
    echo "🔧 Enhanced Deploy: http://localhost:3001/api/v1/deployment/enhanced"
    echo "❤️  Health check: http://localhost:3001/health"
    echo "🎯 Demo endpoints: http://localhost:3001/api/v1/demo/"
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
echo "🔧 FastAPI Backend: http://localhost:3001"
echo "📝 API Documentation: http://localhost:3001/docs"
echo "🚀 Enhanced Deploy: http://localhost:3001/api/v1/deployment/enhanced"
echo "🎯 Demo Endpoints: http://localhost:3001/api/v1/demo/"
echo "❤️  Health Check: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
