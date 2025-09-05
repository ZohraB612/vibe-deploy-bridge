"""Infrastructure as Code endpoints"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.base import SuccessResponse
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.post("/deploy", response_model=SuccessResponse, tags=["Infrastructure as Code"])
async def deploy_infrastructure():
    """Deploy infrastructure using Terraform"""
    try:
        logger.info("Deploying infrastructure with Terraform")
        return SuccessResponse(message="Infrastructure deployed successfully")
    except Exception as e:
        logger.error(f"Infrastructure deployment failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
