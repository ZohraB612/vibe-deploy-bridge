"""
Kubernetes orchestration endpoints with real kubectl operations
"""

import os
import subprocess
import yaml
import tempfile
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any, Optional
from app.schemas.deployment import KubernetesDeployRequest, KubernetesScaleRequest
from app.schemas.base import SuccessResponse
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

@router.post("/deploy", response_model=SuccessResponse, tags=["Kubernetes"])
async def deploy_to_kubernetes(request: KubernetesDeployRequest):
    """
    Deploy application to Kubernetes cluster using real kubectl commands
    """
    try:
        logger.info(f"Deploying to Kubernetes: {request.deployment_name}")
        
        # Generate Kubernetes manifests
        manifests = await generate_kubernetes_manifests(request)
        
        # Apply manifests to cluster
        apply_result = await apply_kubernetes_manifests(manifests)
        
        # Wait for deployment to be ready
        if request.wait_for_ready:
            ready_result = await wait_for_deployment_ready(
                request.namespace, 
                request.deployment_name, 
                request.timeout
            )
        else:
            ready_result = {"status": "skipped"}
        
        return SuccessResponse(
            message=f"Application {request.deployment_name} deployed to Kubernetes successfully",
            data={
                "namespace": request.namespace,
                "deployment_name": request.deployment_name,
                "replicas": request.replicas,
                "image": request.image,
                "status": "deployed",
                "manifests": manifests,
                "apply_result": apply_result,
                "ready_result": ready_result
            }
        )
    except Exception as e:
        logger.error(f"Kubernetes deployment failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kubernetes deployment failed: {str(e)}"
        )

@router.post("/scale", response_model=SuccessResponse, tags=["Kubernetes"])
async def scale_kubernetes_deployment(request: KubernetesScaleRequest):
    """
    Scale Kubernetes deployment using real kubectl commands
    """
    try:
        logger.info(f"Scaling Kubernetes deployment: {request.deployment_name}")
        
        # Scale deployment
        scale_result = await scale_deployment(
            request.namespace, 
            request.deployment_name, 
            request.replicas
        )
        
        # Get deployment status
        status_result = await get_deployment_status(request.namespace, request.deployment_name)
        
        return SuccessResponse(
            message=f"Deployment {request.deployment_name} scaled to {request.replicas} replicas",
            data={
                "namespace": request.namespace,
                "deployment_name": request.deployment_name,
                "replicas": request.replicas,
                "status": "scaled",
                "scale_result": scale_result,
                "deployment_status": status_result
            }
        )
    except Exception as e:
        logger.error(f"Kubernetes scaling failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kubernetes scaling failed: {str(e)}"
        )

@router.get("/deployments", response_model=SuccessResponse, tags=["Kubernetes"])
async def list_kubernetes_deployments(namespace: Optional[str] = None):
    """
    List Kubernetes deployments
    """
    try:
        result = await list_deployments(namespace)
        return SuccessResponse(
            message="Kubernetes deployments listed successfully",
            data={"deployments": result}
        )
    except Exception as e:
        logger.error(f"Failed to list deployments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list deployments: {str(e)}"
        )

@router.get("/pods", response_model=SuccessResponse, tags=["Kubernetes"])
async def list_kubernetes_pods(namespace: Optional[str] = None):
    """
    List Kubernetes pods
    """
    try:
        result = await list_pods(namespace)
        return SuccessResponse(
            message="Kubernetes pods listed successfully",
            data={"pods": result}
        )
    except Exception as e:
        logger.error(f"Failed to list pods: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list pods: {str(e)}"
        )

@router.get("/services", response_model=SuccessResponse, tags=["Kubernetes"])
async def list_kubernetes_services(namespace: Optional[str] = None):
    """
    List Kubernetes services
    """
    try:
        result = await list_services(namespace)
        return SuccessResponse(
            message="Kubernetes services listed successfully",
            data={"services": result}
        )
    except Exception as e:
        logger.error(f"Failed to list services: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list services: {str(e)}"
        )

@router.delete("/deployment/{namespace}/{deployment_name}", response_model=SuccessResponse, tags=["Kubernetes"])
async def delete_kubernetes_deployment(namespace: str, deployment_name: str):
    """
    Delete Kubernetes deployment
    """
    try:
        result = await delete_deployment(namespace, deployment_name)
        return SuccessResponse(
            message=f"Deployment {deployment_name} deleted successfully",
            data=result
        )
    except Exception as e:
        logger.error(f"Failed to delete deployment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete deployment: {str(e)}"
        )

# Helper functions for Kubernetes operations
async def generate_kubernetes_manifests(request: KubernetesDeployRequest) -> Dict[str, Any]:
    """Generate Kubernetes manifests for deployment"""
    
    # Deployment manifest
    deployment_manifest = {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {
            "name": request.deployment_name,
            "namespace": request.namespace,
            "labels": {
                "app": request.deployment_name,
                "version": "v1"
            }
        },
        "spec": {
            "replicas": request.replicas,
            "selector": {
                "matchLabels": {
                    "app": request.deployment_name
                }
            },
            "template": {
                "metadata": {
                    "labels": {
                        "app": request.deployment_name
                    }
                },
                "spec": {
                    "containers": [{
                        "name": request.deployment_name,
                        "image": request.image,
                        "ports": [{
                            "containerPort": request.port,
                            "name": "http"
                        }],
                        "env": [{"name": k, "value": v} for k, v in (request.environment or {}).items()],
                        "resources": {
                            "requests": {
                                "memory": "128Mi",
                                "cpu": "100m"
                            },
                            "limits": {
                                "memory": "512Mi",
                                "cpu": "500m"
                            }
                        } if request.resources else {}
                    }]
                }
            }
        }
    }
    
    # Service manifest
    service_manifest = {
        "apiVersion": "v1",
        "kind": "Service",
        "metadata": {
            "name": f"{request.deployment_name}-service",
            "namespace": request.namespace,
            "labels": {
                "app": request.deployment_name
            }
        },
        "spec": {
            "type": request.service_type,
            "ports": [{
                "port": request.port,
                "targetPort": "http",
                "protocol": "TCP"
            }],
            "selector": {
                "app": request.deployment_name
            }
        }
    }
    
    manifests = {
        "deployment": deployment_manifest,
        "service": service_manifest
    }
    
    # Add ingress if enabled
    if request.ingress_enabled:
        ingress_manifest = {
            "apiVersion": "networking.k8s.io/v1",
            "kind": "Ingress",
            "metadata": {
                "name": f"{request.deployment_name}-ingress",
                "namespace": request.namespace,
                "labels": {
                    "app": request.deployment_name
                }
            },
            "spec": {
                "rules": [{
                    "host": request.ingress_host or f"{request.deployment_name}.local",
                    "http": {
                        "paths": [{
                            "path": "/",
                            "pathType": "Prefix",
                            "backend": {
                                "service": {
                                    "name": f"{request.deployment_name}-service",
                                    "port": {
                                        "number": request.port
                                    }
                                }
                            }
                        }]
                    }
                }]
            }
        }
        
        if request.ingress_tls:
            ingress_manifest["spec"]["tls"] = [request.ingress_tls]
        
        manifests["ingress"] = ingress_manifest
    
    return manifests

async def apply_kubernetes_manifests(manifests: Dict[str, Any]) -> Dict[str, Any]:
    """Apply Kubernetes manifests to cluster"""
    results = {}
    
    for manifest_type, manifest in manifests.items():
        try:
            # Write manifest to temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
                yaml.dump(manifest, f)
                manifest_file = f.name
            
            # Apply manifest
            cmd = ["kubectl", "apply", "-f", manifest_file]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            results[manifest_type] = {
                "success": True,
                "output": result.stdout,
                "manifest": manifest
            }
            
            # Clean up temporary file
            os.unlink(manifest_file)
            
        except subprocess.CalledProcessError as e:
            results[manifest_type] = {
                "success": False,
                "error": e.stderr,
                "return_code": e.returncode
            }
    
    return results

async def scale_deployment(namespace: str, deployment_name: str, replicas: int) -> Dict[str, Any]:
    """Scale a Kubernetes deployment"""
    try:
        cmd = ["kubectl", "scale", "deployment", deployment_name, f"--replicas={replicas}", f"-n={namespace}"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        return {
            "success": True,
            "output": result.stdout,
            "replicas": replicas
        }
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": e.stderr,
            "return_code": e.returncode
        }

async def wait_for_deployment_ready(namespace: str, deployment_name: str, timeout: int) -> Dict[str, Any]:
    """Wait for deployment to be ready"""
    try:
        cmd = ["kubectl", "rollout", "status", f"deployment/{deployment_name}", f"-n={namespace}", f"--timeout={timeout}s"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        return {
            "success": True,
            "output": result.stdout,
            "status": "ready"
        }
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": e.stderr,
            "return_code": e.returncode,
            "status": "timeout"
        }

async def get_deployment_status(namespace: str, deployment_name: str) -> Dict[str, Any]:
    """Get deployment status"""
    try:
        cmd = ["kubectl", "get", "deployment", deployment_name, f"-n={namespace}", "-o", "json"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        import json
        deployment_info = json.loads(result.stdout)
        
        return {
            "success": True,
            "deployment": {
                "name": deployment_info["metadata"]["name"],
                "namespace": deployment_info["metadata"]["namespace"],
                "replicas": deployment_info["spec"]["replicas"],
                "ready_replicas": deployment_info["status"].get("readyReplicas", 0),
                "available_replicas": deployment_info["status"].get("availableReplicas", 0),
                "conditions": deployment_info["status"].get("conditions", [])
            }
        }
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": e.stderr,
            "return_code": e.returncode
        }

async def list_deployments(namespace: Optional[str] = None) -> List[Dict[str, Any]]:
    """List Kubernetes deployments"""
    try:
        # Check if kubectl is available
        try:
            subprocess.run(["kubectl", "version", "--client"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("kubectl not found or not configured. Returning empty list.")
            return []
        
        cmd = ["kubectl", "get", "deployments", "-o", "json"]
        if namespace:
            cmd.extend(["-n", namespace])
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        import json
        deployments_data = json.loads(result.stdout)
        
        deployments = []
        for item in deployments_data.get("items", []):
            deployments.append({
                "name": item["metadata"]["name"],
                "namespace": item["metadata"]["namespace"],
                "replicas": item["spec"]["replicas"],
                "ready_replicas": item["status"].get("readyReplicas", 0),
                "available_replicas": item["status"].get("availableReplicas", 0),
                "age": item["metadata"]["creationTimestamp"]
            })
        
        return deployments
    except subprocess.CalledProcessError as e:
        return []

async def list_pods(namespace: Optional[str] = None) -> List[Dict[str, Any]]:
    """List Kubernetes pods"""
    try:
        # Check if kubectl is available
        try:
            subprocess.run(["kubectl", "version", "--client"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("kubectl not found or not configured. Returning empty list.")
            return []
        
        cmd = ["kubectl", "get", "pods", "-o", "json"]
        if namespace:
            cmd.extend(["-n", namespace])
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        import json
        pods_data = json.loads(result.stdout)
        
        pods = []
        for item in pods_data.get("items", []):
            pods.append({
                "name": item["metadata"]["name"],
                "namespace": item["metadata"]["namespace"],
                "status": item["status"]["phase"],
                "ready": item["status"].get("containerStatuses", [{}])[0].get("ready", False),
                "restarts": item["status"].get("containerStatuses", [{}])[0].get("restartCount", 0),
                "age": item["metadata"]["creationTimestamp"]
            })
        
        return pods
    except subprocess.CalledProcessError as e:
        return []

async def list_services(namespace: Optional[str] = None) -> List[Dict[str, Any]]:
    """List Kubernetes services"""
    try:
        # Check if kubectl is available
        try:
            subprocess.run(["kubectl", "version", "--client"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("kubectl not found or not configured. Returning empty list.")
            return []
        
        cmd = ["kubectl", "get", "services", "-o", "json"]
        if namespace:
            cmd.extend(["-n", namespace])
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        import json
        services_data = json.loads(result.stdout)
        
        services = []
        for item in services_data.get("items", []):
            services.append({
                "name": item["metadata"]["name"],
                "namespace": item["metadata"]["namespace"],
                "type": item["spec"]["type"],
                "cluster_ip": item["spec"].get("clusterIP", ""),
                "external_ip": item["spec"].get("externalIPs", []),
                "ports": item["spec"].get("ports", []),
                "age": item["metadata"]["creationTimestamp"]
            })
        
        return services
    except subprocess.CalledProcessError as e:
        return []

async def delete_deployment(namespace: str, deployment_name: str) -> Dict[str, Any]:
    """Delete Kubernetes deployment"""
    try:
        cmd = ["kubectl", "delete", "deployment", deployment_name, f"-n={namespace}"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        return {
            "success": True,
            "output": result.stdout,
            "deployment_name": deployment_name,
            "namespace": namespace
        }
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": e.stderr,
            "return_code": e.returncode
        }