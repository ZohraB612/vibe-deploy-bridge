"""
Custom exception classes for DeployHub API
"""

from datetime import datetime
from typing import Optional, Dict, Any

class DeployHubException(Exception):
    """Base exception for DeployHub API"""
    
    def __init__(
        self,
        message: str,
        error_type: str = "DeployHubError",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_type = error_type
        self.status_code = status_code
        self.details = details or {}
        self.timestamp = datetime.utcnow()
        super().__init__(self.message)

class ValidationError(DeployHubException):
    """Validation error exception"""
    
    def __init__(self, message: str = "Validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_type="ValidationError",
            status_code=422,
            details=details
        )

class NotFoundError(DeployHubException):
    """Resource not found exception"""
    
    def __init__(self, resource: str = "Resource", message: Optional[str] = None):
        if not message:
            message = f"{resource} not found"
        super().__init__(
            message=message,
            error_type="NotFoundError",
            status_code=404
        )

class UnauthorizedError(DeployHubException):
    """Unauthorized access exception"""
    
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            error_type="UnauthorizedError",
            status_code=401
        )

class ForbiddenError(DeployHubException):
    """Forbidden access exception"""
    
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            message=message,
            error_type="ForbiddenError",
            status_code=403
        )

class ConflictError(DeployHubException):
    """Resource conflict exception"""
    
    def __init__(self, message: str = "Conflict"):
        super().__init__(
            message=message,
            error_type="ConflictError",
            status_code=409
        )

class RateLimitError(DeployHubException):
    """Rate limit exceeded exception"""
    
    def __init__(self, message: str = "Too many requests"):
        super().__init__(
            message=message,
            error_type="RateLimitError",
            status_code=429
        )

class InternalServerError(DeployHubException):
    """Internal server error exception"""
    
    def __init__(self, message: str = "Internal server error"):
        super().__init__(
            message=message,
            error_type="InternalServerError",
            status_code=500
        )

class ServiceUnavailableError(DeployHubException):
    """Service unavailable exception"""
    
    def __init__(self, message: str = "Service unavailable"):
        super().__init__(
            message=message,
            error_type="ServiceUnavailableError",
            status_code=503
        )

# Service-specific exceptions
class ContainerizationError(DeployHubException):
    """Containerization service error"""
    
    def __init__(self, message: str = "Containerization failed"):
        super().__init__(
            message=message,
            error_type="ContainerizationError",
            status_code=500
        )

class KubernetesError(DeployHubException):
    """Kubernetes service error"""
    
    def __init__(self, message: str = "Kubernetes operation failed"):
        super().__init__(
            message=message,
            error_type="KubernetesError",
            status_code=500
        )

class PrefectError(DeployHubException):
    """Prefect service error"""
    
    def __init__(self, message: str = "Prefect operation failed"):
        super().__init__(
            message=message,
            error_type="PrefectError",
            status_code=500
        )

class TerraformError(DeployHubException):
    """Terraform service error"""
    
    def __init__(self, message: str = "Terraform operation failed"):
        super().__init__(
            message=message,
            error_type="TerraformError",
            status_code=500
        )

class ScalingError(DeployHubException):
    """Scaling service error"""
    
    def __init__(self, message: str = "Scaling operation failed"):
        super().__init__(
            message=message,
            error_type="ScalingError",
            status_code=500
        )

class MonitoringError(DeployHubException):
    """Monitoring service error"""
    
    def __init__(self, message: str = "Monitoring operation failed"):
        super().__init__(
            message=message,
            error_type="MonitoringError",
            status_code=500
        )

class DeploymentError(DeployHubException):
    """Deployment service error"""
    
    def __init__(self, message: str = "Deployment failed"):
        super().__init__(
            message=message,
            error_type="DeploymentError",
            status_code=500
        )

class AWSError(DeployHubException):
    """AWS service error"""
    
    def __init__(self, message: str = "AWS operation failed", service: Optional[str] = None):
        if service:
            message = f"AWS {service} operation failed: {message}"
        super().__init__(
            message=message,
            error_type="AWSError",
            status_code=500
        )

class ProjectDetectionError(DeployHubException):
    """Project detection error"""
    
    def __init__(self, message: str = "Project detection failed"):
        super().__init__(
            message=message,
            error_type="ProjectDetectionError",
            status_code=400
        )

class BuildError(DeployHubException):
    """Build process error"""
    
    def __init__(self, message: str = "Build failed"):
        super().__init__(
            message=message,
            error_type="BuildError",
            status_code=500
        )

class ConfigurationError(DeployHubException):
    """Configuration error"""
    
    def __init__(self, message: str = "Configuration error"):
        super().__init__(
            message=message,
            error_type="ConfigurationError",
            status_code=400
        )
