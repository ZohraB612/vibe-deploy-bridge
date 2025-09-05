"""
Auto-scaling endpoints with real AWS integration
"""

from fastapi import APIRouter, HTTPException, status, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, model_validator
from app.schemas.base import SuccessResponse
from app.core.logging import get_logger
from app.services.auto_scaling_service import AutoScalingService

class ECSScaleRequest(BaseModel):
    cluster_name: Optional[str] = Field(None, description="ECS cluster name")
    service_name: Optional[str] = Field(None, description="ECS service name")
    target_capacity: int = Field(..., description="Target capacity")
    reason: str = Field("Manual scaling", description="Scaling reason")
    resource_id: Optional[str] = Field(None, description="Resource identifier")
    
    @model_validator(mode='before')
    @classmethod
    def set_defaults(cls, values):
        # Set defaults if not provided
        if not values.get('cluster_name'):
            values['cluster_name'] = "default-cluster"
        if not values.get('service_name'):
            resource_id = values.get('resource_id', 'default')
            values['service_name'] = f"service-{resource_id}"
        return values

class LambdaScaleRequest(BaseModel):
    function_name: str
    target_capacity: int
    reason: str = "Manual scaling"

class K8sScaleRequest(BaseModel):
    namespace: str = Field(..., description="Kubernetes namespace")
    deployment_name: str = Field(..., description="Deployment name")
    target_replicas: Optional[int] = Field(None, description="Target number of replicas")
    replicas: Optional[int] = Field(None, description="Alternative field name for replicas")
    reason: str = Field("Manual scaling", description="Scaling reason")
    
    @model_validator(mode='before')
    @classmethod
    def validate_replicas(cls, values):
        # Handle both field names for backward compatibility
        target_replicas = values.get('target_replicas')
        replicas = values.get('replicas')
        
        if target_replicas is None and replicas is not None:
            values['target_replicas'] = replicas
        elif target_replicas is None and replicas is None:
            raise ValueError("Either 'target_replicas' or 'replicas' must be provided")
        
        return values

router = APIRouter()
logger = get_logger(__name__)

@router.get("/analyze/{resource_id}", response_model=SuccessResponse, tags=["Scaling"])
async def analyze_scaling_metrics(resource_id: str, resource_type: str = "ecs"):
    """
    Analyze metrics and make scaling decision
    """
    try:
        logger.info(f"Analyzing scaling metrics for {resource_id}")
        
        scaling_service = AutoScalingService()
        decision = await scaling_service.analyze_scaling_metrics(resource_id, resource_type)
        
        return SuccessResponse(
            message=f"Scaling analysis completed for {resource_id}",
            data={
                "resource_id": resource_id,
                "resource_type": resource_type,
                "direction": decision.direction,
                "target_capacity": decision.target_capacity,
                "reason": decision.reason,
                "confidence": decision.confidence,
                "metrics": decision.metrics
            }
        )
    except Exception as e:
        logger.error(f"Scaling analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scaling analysis failed: {str(e)}"
        )

@router.post("/scale/ecs", response_model=SuccessResponse, tags=["Scaling"])
async def scale_ecs_service(request: ECSScaleRequest):
    """
    Scale ECS service
    """
    try:
        # Use validated values (defaults are set in the validator)
        cluster_name = request.cluster_name
        service_name = request.service_name
        
        logger.info(f"Scaling ECS service {service_name} to {request.target_capacity}")
        
        from app.services.auto_scaling_service import ScalingDecision
        
        decision = ScalingDecision(
            direction='up' if request.target_capacity > 1 else 'down',
            target_capacity=request.target_capacity,
            reason=request.reason,
            confidence=1.0,
            metrics={}
        )
        
        scaling_service = AutoScalingService()
        result = await scaling_service.scale_ecs_service(cluster_name, service_name, decision)
        
        # Check if the service call failed
        if not result.get('success', True):
            error_str = str(result.get('error', '')).lower()
            if "accessdenied" in error_str or "unauthorized" in error_str or "forbidden" in error_str:
                return SuccessResponse(
                    message=f"ECS scaling configuration generated for {service_name} (AWS permissions required)",
                    data={
                        "success": False,
                        "cluster_name": cluster_name,
                        "service_name": service_name,
                        "target_capacity": request.target_capacity,
                        "error": result.get('error'),
                        "note": "AWS permissions required. Please ensure the service has the necessary IAM permissions for ECS operations.",
                        "required_permissions": [
                            "ecs:UpdateService",
                            "ecs:DescribeServices",
                            "ecs:DescribeClusters"
                        ],
                        "aws_cli_command": f"aws ecs update-service --cluster {cluster_name} --service {service_name} --desired-count {request.target_capacity}"
                    }
                )
        
        return SuccessResponse(
            message=f"ECS service {service_name} scaled successfully",
            data=result
        )
    except Exception as e:
        logger.error(f"ECS scaling failed: {e}")
        
        # Check if it's an AWS permissions error
        error_str = str(e).lower()
        if "accessdenied" in error_str or "unauthorized" in error_str or "forbidden" in error_str:
            return SuccessResponse(
                message=f"ECS scaling configuration generated for {service_name} (AWS permissions required)",
                data={
                    "success": False,
                    "cluster_name": cluster_name,
                    "service_name": service_name,
                    "target_capacity": request.target_capacity,
                    "error": str(e),
                    "note": "AWS permissions required. Please ensure the service has the necessary IAM permissions for ECS operations.",
                    "required_permissions": [
                        "ecs:UpdateService",
                        "ecs:DescribeServices",
                        "ecs:DescribeClusters"
                    ],
                    "aws_cli_command": f"aws ecs update-service --cluster {cluster_name} --service {service_name} --desired-count {request.target_capacity}"
                }
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ECS scaling failed: {str(e)}"
        )

@router.post("/scale/lambda", response_model=SuccessResponse, tags=["Scaling"])
async def scale_lambda_function(request: LambdaScaleRequest):
    """
    Scale Lambda function
    """
    try:
        logger.info(f"Scaling Lambda function {request.function_name}")
        
        from app.services.auto_scaling_service import ScalingDecision
        
        decision = ScalingDecision(
            direction='up' if request.target_capacity > 1 else 'down',
            target_capacity=request.target_capacity,
            reason=request.reason,
            confidence=1.0,
            metrics={}
        )
        
        scaling_service = AutoScalingService()
        result = await scaling_service.scale_lambda_function(request.function_name, decision)
        
        return SuccessResponse(
            message=f"Lambda function {request.function_name} scaled successfully",
            data=result
        )
    except Exception as e:
        logger.error(f"Lambda scaling failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lambda scaling failed: {str(e)}"
        )

@router.post("/scale/k8s", response_model=SuccessResponse, tags=["Scaling"])
async def scale_kubernetes_deployment(request: K8sScaleRequest):
    """
    Scale Kubernetes deployment
    """
    try:
        logger.info(f"Scaling Kubernetes deployment {request.deployment_name} to {request.target_replicas} replicas")
        
        # Check if kubectl is available
        import subprocess
        try:
            subprocess.run(["kubectl", "version", "--client"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("kubectl not found. Returning scaling configuration for manual application.")
            return SuccessResponse(
                message=f"Kubernetes scaling configuration generated for {request.deployment_name} (kubectl not available)",
                data={
                    "namespace": request.namespace,
                    "deployment_name": request.deployment_name,
                    "target_replicas": request.target_replicas,
                    "command": f"kubectl scale deployment {request.deployment_name} --replicas={request.target_replicas} -n {request.namespace}",
                    "note": "kubectl not found. Run the command manually to scale the deployment."
                }
            )
        
        from app.services.auto_scaling_service import ScalingDecision
        
        decision = ScalingDecision(
            direction='up' if request.target_replicas > 1 else 'down',
            target_capacity=request.target_replicas,
            reason=request.reason,
            confidence=1.0,
            metrics={}
        )
        
        scaling_service = AutoScalingService()
        result = await scaling_service.scale_kubernetes_deployment(request.namespace, request.deployment_name, decision)
        
        return SuccessResponse(
            message=f"Kubernetes deployment {request.deployment_name} scaled successfully",
            data=result
        )
    except Exception as e:
        logger.error(f"Kubernetes scaling failed: {e}")
        
        # Check if it's a kubectl-related error
        error_str = str(e).lower()
        if "kubectl" in error_str or "no such file" in error_str:
            return SuccessResponse(
                message=f"Kubernetes scaling configuration generated for {request.deployment_name} (kubectl not available)",
                data={
                    "namespace": request.namespace,
                    "deployment_name": request.deployment_name,
                    "target_replicas": request.target_replicas,
                    "command": f"kubectl scale deployment {request.deployment_name} --replicas={request.target_replicas} -n {request.namespace}",
                    "note": "kubectl not found. Run the command manually to scale the deployment.",
                    "error": str(e)
                }
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kubernetes scaling failed: {str(e)}"
        )

@router.post("/policy/create", response_model=SuccessResponse, tags=["Scaling"])
async def create_autoscaling_policy(
    resource_id: str,
    resource_type: str,
    min_capacity: int = 1,
    max_capacity: int = 10,
    target_cpu: float = 70.0,
    scale_out_cooldown: int = 300,
    scale_in_cooldown: int = 300
):
    """
    Create auto-scaling policy for resource
    """
    try:
        logger.info(f"Creating auto-scaling policy for {resource_id}")
        
        config = {
            "min_capacity": min_capacity,
            "max_capacity": max_capacity,
            "target_cpu": target_cpu,
            "scale_out_cooldown": scale_out_cooldown,
            "scale_in_cooldown": scale_in_cooldown
        }
        
        scaling_service = AutoScalingService()
        result = await scaling_service.create_autoscaling_policy(resource_id, resource_type, config)
        
        # Check if the service call failed
        if not result.get('success', True):
            error_str = str(result.get('error', '')).lower()
            if "accessdenied" in error_str or "unauthorized" in error_str or "forbidden" in error_str:
                return SuccessResponse(
                    message=f"Auto-scaling policy configuration generated for {resource_id} (AWS permissions required)",
                    data={
                        "success": False,
                        "error": result.get('error'),
                        "resource_id": resource_id,
                        "resource_type": resource_type,
                        "configuration": {
                            "min_capacity": min_capacity,
                            "max_capacity": max_capacity,
                            "target_cpu": target_cpu,
                            "scale_out_cooldown": scale_out_cooldown,
                            "scale_in_cooldown": scale_in_cooldown
                        },
                        "note": "AWS permissions required. Please ensure the service has the necessary IAM permissions for application-autoscaling operations.",
                        "required_permissions": [
                            "application-autoscaling:RegisterScalableTarget",
                            "application-autoscaling:PutScalingPolicy",
                            "application-autoscaling:DescribeScalableTargets",
                            "application-autoscaling:DescribeScalingPolicies"
                        ],
                        "aws_cli_commands": [
                            f"aws application-autoscaling register-scalable-target --service-namespace ecs --resource-id {resource_id} --scalable-dimension ecs:service:DesiredCount --min-capacity {min_capacity} --max-capacity {max_capacity}",
                            f"aws application-autoscaling put-scaling-policy --service-namespace ecs --resource-id {resource_id} --scalable-dimension ecs:service:DesiredCount --policy-name {resource_id}-cpu-scaling --policy-type TargetTrackingScaling --target-tracking-scaling-policy-configuration TargetValue={target_cpu},ScaleOutCooldown={scale_out_cooldown},ScaleInCooldown={scale_in_cooldown},PredefinedMetricSpecification={{PredefinedMetricType=ECSServiceAverageCPUUtilization}}"
                        ]
                    }
                )
        
        return SuccessResponse(
            message=f"Auto-scaling policy created for {resource_id}",
            data=result
        )
    except Exception as e:
        logger.error(f"Policy creation failed: {e}")
        
        # Check if it's an AWS permissions error
        error_str = str(e).lower()
        if "accessdenied" in error_str or "unauthorized" in error_str or "forbidden" in error_str:
            return SuccessResponse(
                message=f"Auto-scaling policy configuration generated for {resource_id} (AWS permissions required)",
                data={
                    "success": False,
                    "error": str(e),
                    "resource_id": resource_id,
                    "resource_type": resource_type,
                    "configuration": {
                        "min_capacity": min_capacity,
                        "max_capacity": max_capacity,
                        "target_cpu": target_cpu,
                        "scale_out_cooldown": scale_out_cooldown,
                        "scale_in_cooldown": scale_in_cooldown
                    },
                    "note": "AWS permissions required. Please ensure the service has the necessary IAM permissions for application-autoscaling operations.",
                    "required_permissions": [
                        "application-autoscaling:RegisterScalableTarget",
                        "application-autoscaling:PutScalingPolicy",
                        "application-autoscaling:DescribeScalableTargets",
                        "application-autoscaling:DescribeScalingPolicies"
                    ],
                    "aws_cli_commands": [
                        f"aws application-autoscaling register-scalable-target --service-namespace ecs --resource-id {resource_id} --scalable-dimension ecs:service:DesiredCount --min-capacity {min_capacity} --max-capacity {max_capacity}",
                        f"aws application-autoscaling put-scaling-policy --service-namespace ecs --resource-id {resource_id} --scalable-dimension ecs:service:DesiredCount --policy-name {resource_id}-cpu-scaling --policy-type TargetTrackingScaling --target-tracking-scaling-policy-configuration TargetValue={target_cpu},ScaleOutCooldown={scale_out_cooldown},ScaleInCooldown={scale_in_cooldown},PredefinedMetricSpecification={{PredefinedMetricType=ECSServiceAverageCPUUtilization}}"
                    ]
                }
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Policy creation failed: {str(e)}"
        )

@router.delete("/policy/{resource_id}", response_model=SuccessResponse, tags=["Scaling"])
async def delete_autoscaling_policy(resource_id: str, resource_type: str = "ecs"):
    """
    Delete auto-scaling policy for resource
    """
    try:
        logger.info(f"Deleting auto-scaling policy for {resource_id}")
        
        scaling_service = AutoScalingService()
        result = await scaling_service.delete_autoscaling_policy(resource_id, resource_type)
        
        return SuccessResponse(
            message=f"Auto-scaling policy deleted for {resource_id}",
            data=result
        )
    except Exception as e:
        logger.error(f"Policy deletion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Policy deletion failed: {str(e)}"
        )

@router.get("/metrics/{resource_id}", response_model=SuccessResponse, tags=["Scaling"])
async def get_scaling_metrics(resource_id: str, resource_type: str = "ecs"):
    """
    Get scaling metrics for resource
    """
    try:
        logger.info(f"Getting scaling metrics for {resource_id}")
        
        scaling_service = AutoScalingService()
        metrics = await scaling_service.get_cloudwatch_metrics(resource_id, resource_type, 0, 0)
        
        return SuccessResponse(
            message=f"Scaling metrics retrieved for {resource_id}",
            data={"metrics": metrics}
        )
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get metrics: {str(e)}"
        )

class HPARequest(BaseModel):
    namespace: str
    deployment_name: str
    min_replicas: int = 1
    max_replicas: int = 10
    target_cpu: int = 70

@router.post("/setup-hpa", response_model=SuccessResponse, tags=["Scaling"])
async def setup_horizontal_pod_autoscaler(request: HPARequest):
    """
    Setup Horizontal Pod Autoscaler for Kubernetes
    """
    try:
        logger.info(f"Setting up HPA for {request.deployment_name}")
        
        import subprocess
        import tempfile
        import yaml
        import os
        
        # Check if kubectl is available
        try:
            subprocess.run(["kubectl", "version", "--client"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("kubectl not found. Returning HPA manifest for manual application.")
            # Create HPA manifest
            hpa_manifest = {
                "apiVersion": "autoscaling/v2",
                "kind": "HorizontalPodAutoscaler",
                "metadata": {
                    "name": f"{request.deployment_name}-hpa",
                    "namespace": request.namespace
                },
                "spec": {
                    "scaleTargetRef": {
                        "apiVersion": "apps/v1",
                        "kind": "Deployment",
                        "name": request.deployment_name
                    },
                    "minReplicas": request.min_replicas,
                    "maxReplicas": request.max_replicas,
                    "metrics": [{
                        "type": "Resource",
                        "resource": {
                            "name": "cpu",
                            "target": {
                                "type": "Utilization",
                                "averageUtilization": request.target_cpu
                            }
                        }
                    }]
                }
            }
            
            return SuccessResponse(
                message=f"HPA manifest generated for {request.deployment_name} (kubectl not available)",
                data={
                    "deployment_name": request.deployment_name,
                    "namespace": request.namespace,
                    "min_replicas": request.min_replicas,
                    "max_replicas": request.max_replicas,
                    "target_cpu": request.target_cpu,
                    "manifest": hpa_manifest,
                    "note": "kubectl not found. Apply the manifest manually using: kubectl apply -f <manifest_file>"
                }
            )
        
        # Create HPA manifest
        hpa_manifest = {
            "apiVersion": "autoscaling/v2",
            "kind": "HorizontalPodAutoscaler",
            "metadata": {
                "name": f"{request.deployment_name}-hpa",
                "namespace": request.namespace
            },
            "spec": {
                "scaleTargetRef": {
                    "apiVersion": "apps/v1",
                    "kind": "Deployment",
                    "name": request.deployment_name
                },
                "minReplicas": request.min_replicas,
                "maxReplicas": request.max_replicas,
                "metrics": [{
                    "type": "Resource",
                    "resource": {
                        "name": "cpu",
                        "target": {
                            "type": "Utilization",
                            "averageUtilization": request.target_cpu
                        }
                    }
                }]
            }
        }
        
        # Write manifest to temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(hpa_manifest, f)
            manifest_file = f.name
        
        try:
            # Apply HPA manifest
            cmd = ["kubectl", "apply", "-f", manifest_file]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            # Clean up temporary file
            os.unlink(manifest_file)
            
            return SuccessResponse(
                message=f"HPA configured successfully for {request.deployment_name}",
                data={
                    "deployment_name": request.deployment_name,
                    "namespace": request.namespace,
                    "min_replicas": request.min_replicas,
                    "max_replicas": request.max_replicas,
                    "target_cpu": request.target_cpu,
                    "output": result.stdout
                }
            )
        except subprocess.CalledProcessError as e:
            # Clean up temporary file
            if os.path.exists(manifest_file):
                os.unlink(manifest_file)
            
            return SuccessResponse(
                message=f"HPA manifest generated for {request.deployment_name} (kubectl apply failed)",
                data={
                    "deployment_name": request.deployment_name,
                    "namespace": request.namespace,
                    "min_replicas": request.min_replicas,
                    "max_replicas": request.max_replicas,
                    "target_cpu": request.target_cpu,
                    "manifest": hpa_manifest,
                    "error": e.stderr,
                    "note": "kubectl apply failed. Apply the manifest manually using: kubectl apply -f <manifest_file>"
                }
            )
            
    except Exception as e:
        logger.error(f"HPA setup failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"HPA setup failed: {str(e)}"
        )