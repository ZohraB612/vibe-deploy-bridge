#!/usr/bin/env python3
"""
Startup script for DeployHub FastAPI backend
"""

import uvicorn
from app.core.config import settings
from app.core.logging import setup_logging

if __name__ == "__main__":
    # Setup logging
    setup_logging()
    
    print("🚀 Starting DeployHub Enhanced Backend (FastAPI)")
    print(f"📝 Environment: {settings.ENVIRONMENT}")
    print(f"🌐 Host: {settings.HOST}:{settings.PORT}")
    print(f"📚 API Documentation: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"❤️  Health Check: http://{settings.HOST}:{settings.PORT}/health")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )
