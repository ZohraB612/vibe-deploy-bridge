#!/bin/bash

echo "🚀 Starting DeployHub Full Stack..."
echo "=================================="
echo ""

# Check if backend type is specified
BACKEND_TYPE=${1:-"node"}

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping all servers..."
    pkill -f "uvicorn"
    pkill -f "python.*start_server"
    pkill -f "node.*local-server"
    pkill -f "vite"
    pkill -f "npm run dev"
    echo "✅ All servers stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

if [ "$BACKEND_TYPE" = "fastapi" ]; then
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
        echo "❌ FastAPI backend server failed to start"
        exit 1
    fi

elif [ "$BACKEND_TYPE" = "node" ]; then
    echo "🔧 Setting up Node.js backend..."
    cd src/backend

    # Check if node_modules exists, install if not
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing backend dependencies..."
        npm install
    fi

    # Build the backend
    echo "🔨 Building backend..."
    npm run build

    echo "🚀 Starting Node.js backend server on port 3001..."
    node dist/local-server.js &
    BACKEND_PID=$!
    cd ../..

    # Wait a moment for backend to start
    sleep 3

    # Check if backend is running
    if curl -s http://localhost:3001/health > /dev/null; then
        echo "✅ Node.js backend server started successfully"
        echo "📝 Deploy endpoint: http://localhost:3001/deploy-s3"
        echo "❤️  Health check: http://localhost:3001/health"
        echo "🌐 Server bound to all interfaces (IPv4 + IPv6)"
    else
        echo "❌ Node.js backend server failed to start"
        exit 1
    fi

else
    echo "❌ Invalid backend type. Use 'fastapi' or 'node'"
    echo "Usage: ./start-full-stack.sh [fastapi|node]"
    echo "Default: node"
    exit 1
fi

echo ""
echo "🚀 Starting frontend development server..."
echo "🌐 Frontend will be available on the next available port"
echo ""

# Start frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Full stack started successfully!"
echo "=================================="
echo "🌐 Frontend: Check terminal output for the exact URL"
echo "🔧 Backend: http://localhost:3001"
if [ "$BACKEND_TYPE" = "fastapi" ]; then
    echo "📝 API Documentation: http://localhost:3001/docs"
    echo "🔧 Enhanced Deploy: http://localhost:3001/api/v1/deployment/enhanced"
    echo "🎯 Demo Endpoints: http://localhost:3001/api/v1/demo/"
else
    echo "📝 Deploy endpoint: http://localhost:3001/deploy-s3"
fi
echo "❤️  Health Check: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID