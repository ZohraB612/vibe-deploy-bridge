"""
Deployment-related Pydantic schemas
"""

from pydantic import BaseModel, Field, validator, model_validator
from typing import Optional, Dict, Any, List
from .base import ProjectType, Environment, DeploymentStrategy, ResourceConfig, ScalingConfig, MonitoringConfig, SecurityConfig

class ProjectDetection(BaseModel):
    """Project detection result schema"""
    type: ProjectType = Field(..., description="Detected project type")
    build_command: Optional[str] = Field(None, description="Build command for the project")
    output_dir: Optional[str] = Field(None, description="Output directory for built files")
    package_manager: Optional[str] = Field(None, description="Package manager used")
    framework_version: Optional[str] = Field(None, description="Framework version")
    dependencies: List[str] = Field(default_factory=list, description="Project dependencies")

class EnhancedDeploymentRequest(BaseModel):
    """Enhanced deployment request schema"""
    project_name: str = Field(..., min_length=1, max_length=50, description="Name of the project to deploy")
    project_type: ProjectType = Field(..., description="Type of project")
    environment: Environment = Field(Environment.PROD, description="Target environment")
    options: Optional[Dict[str, Any]] = Field(None, description="Deployment options")
    
    # Deployment features
    enable_containerization: bool = Field(True, description="Enable Docker containerization")
    enable_kubernetes: bool = Field(False, description="Enable Kubernetes orchestration")
    enable_prefect: bool = Field(False, description="Enable Prefect workflow orchestration")
    enable_monitoring: bool = Field(True, description="Enable monitoring and observability")
    enable_auto_scaling: bool = Field(False, description="Enable auto-scaling")
    deployment_strategy: DeploymentStrategy = Field(DeploymentStrategy.ROLLING, description="Deployment strategy")
    
    # Infrastructure configuration
    region: str = Field("us-east-1", description="AWS region")
    domain: Optional[str] = Field(None, description="Custom domain name")
    ssl_certificate: Optional[str] = Field(None, description="SSL certificate ARN")
    
    # Resource configuration
    resources: Optional[ResourceConfig] = Field(None, description="Resource requirements")
    scaling: Optional[ScalingConfig] = Field(None, description="Scaling configuration")
    
    # Monitoring and security
    monitoring: Optional[MonitoringConfig] = Field(None, description="Monitoring configuration")
    security: Optional[SecurityConfig] = Field(None, description="Security configuration")
    
    # Custom configuration
    custom_config: Optional[Dict[str, Any]] = Field(None, description="Custom configuration options")

class ContainerizationRequest(BaseModel):
    """Containerization request schema"""
    project_name: str = Field(..., min_length=1, description="Project name")
    detected_project: ProjectDetection = Field(..., description="Detected project information")
    options: Optional[Dict[str, Any]] = Field(None, description="Containerization options")
    
    # Container configuration
    base_image: Optional[str] = Field(None, description="Base Docker image")
    port: int = Field(3000, ge=1, le=65535, description="Application port")
    environment_vars: Optional[Dict[str, str]] = Field(None, description="Environment variables")
    volumes: Optional[List[str]] = Field(None, description="Volume mounts")
    
    # Health check configuration
    health_check: Optional[Dict[str, Any]] = Field(None, description="Health check configuration")
    
    # Build configuration
    build_args: Optional[Dict[str, str]] = Field(None, description="Docker build arguments")
    dockerfile_path: Optional[str] = Field(None, description="Custom Dockerfile path")

class ContainerizationResponse(BaseModel):
    """Response for containerization operations"""
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
    data: Optional[Dict[str, Any]] = Field(None, description="Response data")

class KubernetesDeployRequest(BaseModel):
    """Kubernetes deployment request schema"""
    config: Optional[Dict[str, Any]] = Field(None, description="Kubernetes configuration")
    manifest_files: Optional[List[str]] = Field(None, description="Custom manifest files")
    options: Optional[Dict[str, Any]] = Field(None, description="Deployment options")
    
    # Required Kubernetes fields
    namespace: str = Field(..., min_length=1, description="Kubernetes namespace")
    deployment_name: str = Field(..., min_length=1, description="Deployment name")
    image: str = Field(..., min_length=1, description="Container image")
    replicas: int = Field(1, ge=0, le=100, description="Number of replicas")
    port: int = Field(3000, ge=1, le=65535, description="Service port")
    
    # Environment and resources
    environment: Optional[Dict[str, str]] = Field(None, description="Environment variables")
    resources: Optional[ResourceConfig] = Field(None, description="Resource requirements")
    
    # Service configuration
    service_type: str = Field("ClusterIP", description="Kubernetes service type")
    service_ports: Optional[List[Dict[str, Any]]] = Field(None, description="Service port configuration")
    
    # Ingress configuration
    ingress_enabled: bool = Field(False, description="Enable ingress")
    ingress_host: Optional[str] = Field(None, description="Ingress host")
    ingress_tls: Optional[Dict[str, Any]] = Field(None, description="Ingress TLS configuration")
    
    # Deployment options
    wait_for_ready: bool = Field(True, description="Wait for deployment to be ready")
    timeout: int = Field(300, ge=1, description="Deployment timeout in seconds")

class KubernetesScaleRequest(BaseModel):
    """Kubernetes scaling request schema"""
    namespace: str = Field(..., min_length=1, description="Kubernetes namespace")
    deployment_name: str = Field(..., min_length=1, description="Deployment name")
    replicas: int = Field(..., ge=0, le=100, description="Target number of replicas")

class PrefectFlowRequest(BaseModel):
    """Prefect flow request schema"""
    flow_name: str = Field(..., min_length=1, description="Flow name")
    tasks: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Flow tasks")
    schedule: Optional[Dict[str, Any]] = Field(None, description="Flow schedule")
    options: Optional[Dict[str, Any]] = Field(None, description="Flow options")
    
    # Task configuration (for single task creation)
    task_name: Optional[str] = Field(None, description="Task name")
    task_type: Optional[str] = Field(None, description="Task type")
    task_config: Optional[Dict[str, Any]] = Field(None, description="Task configuration")
    dependencies: Optional[List[str]] = Field(None, description="Task dependencies")
    
    # Schedule configuration
    schedule_type: str = Field("manual", description="Schedule type")
    schedule_value: Optional[str] = Field(None, description="Schedule value")
    
    # Flow options
    retries: int = Field(3, ge=0, description="Number of retries")
    timeout: int = Field(3600, ge=1, description="Flow timeout in seconds")
    
    @model_validator(mode='before')
    @classmethod
    def create_task_from_fields(cls, values):
        # If no tasks provided but single task fields are provided, create a task
        if not values.get('tasks') and values.get('task_name') and values.get('task_type') and values.get('task_config'):
            values['tasks'] = [{
                "name": values['task_name'],
                "type": values['task_type'],
                "config": values['task_config'],
                "dependencies": values.get('dependencies', [])
            }]
        return values

class DeploymentResponse(BaseModel):
    """Deployment response schema"""
    deployment_id: str = Field(..., description="Unique deployment identifier")
    project_name: str = Field(..., description="Project name")
    status: str = Field(..., description="Deployment status")
    environment: Environment = Field(..., description="Target environment")
    created_at: str = Field(..., description="Deployment creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    
    # Deployment details
    url: Optional[str] = Field(None, description="Deployment URL")
    logs: Optional[List[str]] = Field(None, description="Deployment logs")
    errors: Optional[List[str]] = Field(None, description="Deployment errors")
    
    # Resource information
    resources_created: Optional[List[str]] = Field(None, description="Created resources")
    resources_failed: Optional[List[str]] = Field(None, description="Failed resources")
    
    # Monitoring information
    monitoring_enabled: bool = Field(False, description="Whether monitoring is enabled")
    metrics_url: Optional[str] = Field(None, description="Metrics URL")
    logs_url: Optional[str] = Field(None, description="Logs URL")

class DeploymentStatus(BaseModel):
    """Deployment status schema"""
    deployment_id: str = Field(..., description="Deployment identifier")
    status: str = Field(..., description="Current status")
    progress: int = Field(0, ge=0, le=100, description="Deployment progress percentage")
    message: Optional[str] = Field(None, description="Status message")
    details: Optional[Dict[str, Any]] = Field(None, description="Status details")
    last_updated: str = Field(..., description="Last status update timestamp")

class RollbackRequest(BaseModel):
    """Rollback request schema"""
    deployment_id: str = Field(..., description="Deployment to rollback")
    target_version: Optional[str] = Field(None, description="Target version to rollback to")
    force: bool = Field(False, description="Force rollback even if checks fail")
    preserve_data: bool = Field(True, description="Preserve data during rollback")

class RollbackResponse(BaseModel):
    """Rollback response schema"""
    rollback_id: str = Field(..., description="Rollback identifier")
    deployment_id: str = Field(..., description="Original deployment identifier")
    status: str = Field(..., description="Rollback status")
    message: Optional[str] = Field(None, description="Rollback message")
    created_at: str = Field(..., description="Rollback creation timestamp")
