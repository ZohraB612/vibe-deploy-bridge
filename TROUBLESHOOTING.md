# Troubleshooting Guide

## Common Deployment Issues

### 1. Backend Connection Refused Error

**Error**: `Failed to load resource: net::ERR_CONNECTION_REFUSED` when trying to connect to `:3001/deploy-s3`

**Cause**: The backend server is not running on port 3001.

**Solution**: Start the backend server using one of these methods:

#### Option A: Quick Backend Start
```bash
npm run start:backend
```

#### Option B: Full Stack Start (Frontend + Backend)
```bash
npm run start:fullstack
```

#### Option C: Manual Backend Start
```bash
cd src/backend
npm run build
npm run start
```

### 2. QuillBot Extension Errors

**Error**: `Uncaught (in promise) TypeError: Cannot read properties of null (reading 'editorId')`

**Cause**: This is a browser extension error from QuillBot, not related to your application.

**Solution**: 
- Disable the QuillBot browser extension temporarily
- Or ignore these errors as they don't affect your application functionality

### 3. AWS Connection Issues

**Error**: `No existing connection found for user`

**Cause**: AWS credentials or connection not properly established.

**Solution**:
1. Ensure you're signed in to the application
2. Check that AWS credentials are properly configured
3. Verify the backend server is running (see issue #1)

## Quick Fix Commands

### Start Backend Only
```bash
npm run start:backend
```

### Start Full Stack (Recommended)
```bash
npm run start:fullstack
```

### Check Backend Health
```bash
curl http://localhost:3001/health
```

### Check Backend Status
```bash
curl http://localhost:3001/
```

## Server URLs

| Service | URL | Port | Purpose |
|---------|-----|------|---------|
| **Frontend** | http://localhost:8080 | 8080 | React development server |
| **Backend** | http://localhost:3001 | 3001 | Deployment API server |
| **Health Check** | http://localhost:3001/health | 3001 | Backend status |

## Development Workflow

1. **Start Backend**: `npm run start:backend` (in one terminal)
2. **Start Frontend**: `npm run dev` (in another terminal)
3. **Or Start Both**: `npm run start:fullstack` (single command)

## Environment Requirements

- Node.js 18+ 
- npm or yarn
- Port 3001 available for backend
- Port 8080 available for frontend

## Still Having Issues?

1. Check if ports are already in use:
   ```bash
   lsof -i :3001
   lsof -i :8080
   ```

2. Kill existing processes:
   ```bash
   pkill -f "node.*local-server"
   pkill -f "vite"
   ```

3. Restart the servers using the scripts above
