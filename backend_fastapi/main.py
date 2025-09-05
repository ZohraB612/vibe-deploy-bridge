"""
DeployHub Enhanced Backend - FastAPI Implementation
A comprehensive deployment platform with containerization, orchestration, and infrastructure as code capabilities.
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging
from typing import Dict, Any

from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_logging
from app.api.v1.api import api_router
from app.core.exceptions import (
    DeployHubException,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    RateLimitError,
    InternalServerError,
    ServiceUnavailableError
)

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("🚀 Starting DeployHub Enhanced Backend...")
    await init_db()
    logger.info("✅ Database initialized")
    logger.info("🔧 Services initialized")
    logger.info("📚 API Documentation available at /docs")
    logger.info("🎯 Health check available at /health")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down DeployHub Enhanced Backend...")

# Create FastAPI application
app = FastAPI(
    title="DeployHub Enhanced API",
    description="""
    A comprehensive deployment platform that provides:
    
    * **Automatic Project Detection** - Identifies project types and configurations
    * **Containerization** - Automatic Docker container generation
    * **Orchestration** - Kubernetes and Prefect workflow management
    * **Auto-scaling** - Intelligent resource scaling based on metrics
    * **Deployment Strategies** - Blue-green, canary, rolling deployments
    * **Infrastructure as Code** - Terraform integration for AWS resources
    * **Monitoring & Observability** - Comprehensive monitoring and alerting
    * **Multi-cloud Support** - AWS, Azure, GCP deployment capabilities
    
    ## Features
    
    * 🔍 **Smart Project Detection** - Automatically detects React, Vue, Angular, Next.js, and more
    * 🐳 **Containerization** - Generates optimized Dockerfiles and Docker Compose files
    * ☸️ **Kubernetes Orchestration** - Deploy and manage applications on Kubernetes
    * 🔄 **Workflow Orchestration** - Prefect integration for complex deployment workflows
    * 📈 **Auto-scaling** - HPA, VPA, and custom metrics-based scaling
    * 🚀 **Deployment Strategies** - Blue-green, canary, rolling, and recreate deployments
    * 🏗️ **Infrastructure as Code** - Terraform modules for AWS infrastructure
    * 📊 **Monitoring** - CloudWatch, Prometheus, and custom metrics integration
    * 🔒 **Security** - IAM roles, VPC, WAF, and security best practices
    * 🌐 **Multi-cloud** - Support for AWS, Azure, and Google Cloud Platform
    """,
    version="2.0.0",
    contact={
        "name": "DeployHub Team",
        "email": "support@deployhub.com",
        "url": "https://deployhub.com"
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    },
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Global exception handlers
@app.exception_handler(DeployHubException)
async def deployhub_exception_handler(request, exc: DeployHubException):
    """Handle custom DeployHub exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.error_type,
            "message": exc.message,
            "details": exc.details,
            "timestamp": exc.timestamp.isoformat(),
            "path": str(request.url),
            "method": request.method
        }
    )

@app.exception_handler(ValidationError)
async def validation_exception_handler(request, exc: ValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "ValidationError",
            "message": exc.message,
            "details": exc.details,
            "timestamp": exc.timestamp.isoformat(),
            "path": str(request.url),
            "method": request.method
        }
    )

@app.exception_handler(NotFoundError)
async def not_found_exception_handler(request, exc: NotFoundError):
    """Handle not found errors"""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "success": False,
            "error": "NotFoundError",
            "message": exc.message,
            "timestamp": exc.timestamp.isoformat(),
            "path": str(request.url),
            "method": request.method
        }
    )

@app.exception_handler(UnauthorizedError)
async def unauthorized_exception_handler(request, exc: UnauthorizedError):
    """Handle unauthorized errors"""
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "success": False,
            "error": "UnauthorizedError",
            "message": exc.message,
            "timestamp": exc.timestamp.isoformat(),
            "path": str(request.url),
            "method": request.method
        }
    )

@app.exception_handler(ForbiddenError)
async def forbidden_exception_handler(request, exc: ForbiddenError):
    """Handle forbidden errors"""
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "success": False,
            "error": "ForbiddenError",
            "message": exc.message,
            "timestamp": exc.timestamp.isoformat(),
            "path": str(request.url),
            "method": request.method
        }
    )

@app.exception_handler(ConflictError)
async def conflict_exception_handler(request, exc: ConflictError):
    """Handle conflict errors"""
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "success": False,
            "error": "ConflictError",
            "message": exc.message,
            "timestamp": exc.timestamp.isoformat(),
            "path": str(request.url),
            "method": request.method
        }
    )

@app.exception_handler(RateLimitError)
async def rate_limit_exception_handler(request, exc: RateLimitError):
    """Handle rate limit errors"""
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "success": False,
            "error": "RateLimitError",
            "message": exc.message,
            "timestamp": exc.timestamp.isoformat(),
            "path": str(request.url),
            "method": request.method
        }
    )

@app.exception_handler(InternalServerError)
async def internal_server_exception_handler(request, exc: InternalServerError):
    """Handle internal server errors"""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "InternalServerError",
            "message": exc.message,
            "timestamp": exc.timestamp.isoformat(),
            "path": str(request.url),
            "method": request.method
        }
    )

@app.exception_handler(ServiceUnavailableError)
async def service_unavailable_exception_handler(request, exc: ServiceUnavailableError):
    """Handle service unavailable errors"""
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "success": False,
            "error": "ServiceUnavailableError",
            "message": exc.message,
            "timestamp": exc.timestamp.isoformat(),
            "path": str(request.url),
            "method": request.method
        }
    )

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Root endpoint
@app.get("/", tags=["Health"])
async def root():
    """Root endpoint with API overview"""
    return {
        "message": "DeployHub Enhanced Backend API",
        "version": "2.0.0",
        "status": "running",
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "openapi_json": "/openapi.json"
        },
        "endpoints": {
            "health": "/health",
            "enhanced_deploy": "/api/v1/enhanced-deploy",
            "containerize": "/api/v1/containerize",
            "kubernetes": "/api/v1/k8s/*",
            "prefect": "/api/v1/prefect/*",
            "scaling": "/api/v1/scaling/*",
            "deployment": "/api/v1/deploy/*",
            "monitoring": "/api/v1/monitoring/*",
            "terraform": "/api/v1/terraform/*"
        }
    }

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    import psutil
    import time
    
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "uptime": time.time() - psutil.Process().create_time(),
        "memory": {
            "used": psutil.virtual_memory().used,
            "available": psutil.virtual_memory().available,
            "percent": psutil.virtual_memory().percent
        },
        "version": "2.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3001,
        reload=settings.DEBUG,
        log_level="info"
    )
