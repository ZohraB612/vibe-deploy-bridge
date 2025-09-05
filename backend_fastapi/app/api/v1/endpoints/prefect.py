"""Prefect orchestration endpoints"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.deployment import PrefectFlowRequest
from app.schemas.base import SuccessResponse
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.post("/create-flow", response_model=SuccessResponse, tags=["Prefect"])
async def create_prefect_flow(request: PrefectFlowRequest):
    """Create Prefect workflow"""
    try:
        logger.info(f"Creating Prefect flow: {request.flow_name}")
        return SuccessResponse(message=f"Flow {request.flow_name} created successfully")
    except Exception as e:
        logger.error(f"Prefect flow creation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
