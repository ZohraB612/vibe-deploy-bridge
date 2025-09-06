"""
Main API router for DeployHub v1
"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    deployment,
    containerization,
    kubernetes,
    prefect,
    scaling,
    monitoring,
    terraform,
    demo,
    aws
)

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(deployment.router, prefix="/deployment", tags=["Deployment"])
api_router.include_router(containerization.router, prefix="/containerization", tags=["Containerization"])
api_router.include_router(kubernetes.router, prefix="/k8s", tags=["Kubernetes"])
api_router.include_router(prefect.router, prefix="/prefect", tags=["Prefect"])
api_router.include_router(scaling.router, prefix="/scaling", tags=["Scaling"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["Monitoring"])
api_router.include_router(terraform.router, prefix="/terraform", tags=["Infrastructure as Code"])
api_router.include_router(demo.router, prefix="/demo", tags=["Demo"])
api_router.include_router(aws.router, tags=["AWS"])
