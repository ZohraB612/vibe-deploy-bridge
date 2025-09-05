"""
Health check endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import psutil
import time
from app.core.database import check_db_health
from app.core.logging import get_logger
from app.schemas.base import HealthResponse

router = APIRouter()
logger = get_logger(__name__)

@router.get("/", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Basic health check endpoint
    
    Returns the current status of the API service including:
    - Service status
    - Uptime
    - Memory usage
    - Version information
    """
    try:
        # Get system information
        memory = psutil.virtual_memory()
        process = psutil.Process()
        
        return HealthResponse(
            status="healthy",
            timestamp=time.time(),
            uptime=time.time() - process.create_time(),
            memory={
                "used": memory.used,
                "available": memory.available,
                "percent": memory.percent,
                "total": memory.total
            },
            version="2.0.0"
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@router.get("/detailed", tags=["Health"])
async def detailed_health_check():
    """
    Detailed health check endpoint
    
    Returns comprehensive health information including:
    - Database connectivity
    - External service status
    - System resources
    - Service dependencies
    """
    try:
        # Check database health
        db_healthy = await check_db_health()
        
        # Get system information
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        cpu_percent = psutil.cpu_percent(interval=1)
        process = psutil.Process()
        
        # Check external services (placeholder)
        services_status = {
            "database": "healthy" if db_healthy else "unhealthy",
            "aws": "healthy",  # Placeholder - would check AWS connectivity
            "kubernetes": "healthy",  # Placeholder - would check K8s connectivity
            "prefect": "healthy",  # Placeholder - would check Prefect connectivity
        }
        
        return {
            "status": "healthy" if db_healthy else "degraded",
            "timestamp": time.time(),
            "uptime": time.time() - process.create_time(),
            "version": "2.0.0",
            "services": services_status,
            "system": {
                "memory": {
                    "used": memory.used,
                    "available": memory.available,
                    "percent": memory.percent,
                    "total": memory.total
                },
                "disk": {
                    "used": disk.used,
                    "free": disk.free,
                    "percent": (disk.used / disk.total) * 100,
                    "total": disk.total
                },
                "cpu": {
                    "percent": cpu_percent,
                    "count": psutil.cpu_count()
                }
            }
        }
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@router.get("/ready", tags=["Health"])
async def readiness_check():
    """
    Readiness check endpoint for Kubernetes
    
    Used by Kubernetes liveness and readiness probes
    """
    try:
        # Check if all critical services are ready
        db_healthy = await check_db_health()
        
        if not db_healthy:
            raise HTTPException(status_code=503, detail="Database not ready")
        
        return {"status": "ready", "timestamp": time.time()}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Service not ready")

@router.get("/live", tags=["Health"])
async def liveness_check():
    """
    Liveness check endpoint for Kubernetes
    
    Used by Kubernetes liveness probes
    """
    try:
        # Simple check to see if the service is alive
        return {"status": "alive", "timestamp": time.time()}
    except Exception as e:
        logger.error(f"Liveness check failed: {e}")
        raise HTTPException(status_code=503, detail="Service not alive")
