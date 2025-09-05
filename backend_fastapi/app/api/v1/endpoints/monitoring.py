"""Monitoring and observability endpoints"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.base import SuccessResponse
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.get("/metrics/{project_id}", response_model=SuccessResponse, tags=["Monitoring"])
async def get_project_metrics(project_id: str):
    """Get project metrics"""
    try:
        logger.info(f"Getting metrics for project: {project_id}")
        return SuccessResponse(message=f"Metrics retrieved for project {project_id}")
    except Exception as e:
        logger.error(f"Metrics retrieval failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
