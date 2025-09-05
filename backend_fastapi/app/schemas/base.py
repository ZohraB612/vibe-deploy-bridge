"""
Base Pydantic schemas for common response patterns
"""

from pydantic import BaseModel, Field
from typing import Any, Optional, Dict, List
from datetime import datetime
from enum import Enum

class ProjectType(str, Enum):
    """Supported project types"""
    REACT = "react"
    VUE = "vue"
    ANGULAR = "angular"
    NEXTJS = "nextjs"
    NUXT = "nuxt"
    SVELTE = "svelte"
    VITE = "vite"
    WEBPACK = "webpack"
    DOCUSAURUS = "docusaurus"
    PYTHON = "python"
    JAVA = "java"
    GO = "go"
    RUST = "rust"
    PHP = "php"
    STATIC = "static"
    UNKNOWN = "unknown"

class Environment(str, Enum):
    """Deployment environments"""
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"

class DeploymentStrategy(str, Enum):
    """Deployment strategies"""
    BLUE_GREEN = "blue-green"
    CANARY = "canary"
    ROLLING = "rolling"
    RECREATE = "recreate"

class Status(str, Enum):
    """Common status values"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"

class BaseResponse(BaseModel):
    """Base response schema"""
    success: bool = Field(..., description="Whether the operation was successful")
    message: Optional[str] = Field(None, description="Response message")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")

class SuccessResponse(BaseResponse):
    """Success response schema"""
    success: bool = Field(True, description="Operation was successful")
    data: Optional[Any] = Field(None, description="Response data")

class ErrorResponse(BaseResponse):
    """Error response schema"""
    success: bool = Field(False, description="Operation failed")
    error: str = Field(..., description="Error type")
    details: Optional[Dict[str, Any]] = Field(None, description="Error details")

class HealthResponse(BaseModel):
    """Health check response schema"""
    status: str = Field(..., description="Service status")
    timestamp: float = Field(..., description="Unix timestamp")
    uptime: float = Field(..., description="Service uptime in seconds")
    memory: Dict[str, Any] = Field(..., description="Memory usage information")
    version: str = Field(..., description="API version")

class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    sort_by: Optional[str] = Field(None, description="Sort field")
    sort_order: str = Field("asc", pattern="^(asc|desc)$", description="Sort order")

class PaginatedResponse(BaseResponse):
    """Paginated response schema"""
    data: List[Any] = Field(..., description="Response data")
    pagination: Dict[str, Any] = Field(..., description="Pagination information")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")

class ResourceConfig(BaseModel):
    """Resource configuration schema"""
    cpu: Optional[str] = Field(None, description="CPU resource specification")
    memory: Optional[str] = Field(None, description="Memory resource specification")
    storage: Optional[str] = Field(None, description="Storage resource specification")

class ScalingConfig(BaseModel):
    """Scaling configuration schema"""
    min_replicas: int = Field(1, ge=0, description="Minimum number of replicas")
    max_replicas: int = Field(10, ge=1, description="Maximum number of replicas")
    target_cpu_utilization: int = Field(70, ge=1, le=100, description="Target CPU utilization percentage")
    target_memory_utilization: int = Field(80, ge=1, le=100, description="Target memory utilization percentage")

class MonitoringConfig(BaseModel):
    """Monitoring configuration schema"""
    enable_cloudwatch: bool = Field(True, description="Enable CloudWatch monitoring")
    enable_xray: bool = Field(False, description="Enable X-Ray tracing")
    enable_prometheus: bool = Field(False, description="Enable Prometheus metrics")
    log_retention_days: int = Field(30, ge=1, le=365, description="Log retention period in days")

class SecurityConfig(BaseModel):
    """Security configuration schema"""
    enable_iam_roles: bool = Field(True, description="Enable IAM role-based access")
    enable_vpc: bool = Field(False, description="Enable VPC isolation")
    enable_waf: bool = Field(False, description="Enable Web Application Firewall")
    enable_encryption: bool = Field(True, description="Enable encryption at rest and in transit")
