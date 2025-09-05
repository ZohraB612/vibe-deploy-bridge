"""
Containerization endpoints with real Docker operations
"""

import os
import subprocess
import tempfile
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from typing import List, Dict, Any, Optional
from app.schemas.deployment import ContainerizationRequest, ContainerizationResponse
from app.schemas.base import SuccessResponse
from app.core.logging import get_logger
from app.services.project_analyzer import ProjectAnalyzer
from app.services.containerization_service import ContainerizationService

router = APIRouter()
logger = get_logger(__name__)

@router.post("/", response_model=ContainerizationResponse, tags=["Containerization"])
async def containerize_project(
    project_name: str = Form(...),
    project_type: str = Form(...),
    port: int = Form(3000),
    file: UploadFile = File(...)
):
    """
    Containerize a project with real Docker operations
    """
    try:
        logger.info(f"Containerizing project: {project_name}")
        
        # Create temporary directory for project
        with tempfile.TemporaryDirectory() as temp_dir:
            # Save uploaded file
            project_path = os.path.join(temp_dir, project_name)
            os.makedirs(project_path, exist_ok=True)
            
            # Extract uploaded file (assuming it's a zip)
            if file.filename.endswith('.zip'):
                import zipfile
                with zipfile.ZipFile(file.file, 'r') as zip_ref:
                    zip_ref.extractall(project_path)
            else:
                # Save as single file
                file_path = os.path.join(project_path, file.filename)
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
            
            # Analyze the project
            analyzer = ProjectAnalyzer()
            analysis = await analyzer.analyze_project(project_path)
            
            # Generate containerization files
            containerization_service = ContainerizationService()
            containerization_result = await containerization_service.containerize_project(analysis, project_path)
            
            # Write files to project directory
            dockerfile_path = os.path.join(project_path, "Dockerfile")
            with open(dockerfile_path, "w") as f:
                f.write(containerization_result["dockerfile"])
            
            docker_compose_path = os.path.join(project_path, "docker-compose.yml")
            with open(docker_compose_path, "w") as f:
                f.write(containerization_result["docker_compose"])
            
            docker_compose_prod_path = os.path.join(project_path, "docker-compose.prod.yml")
            with open(docker_compose_prod_path, "w") as f:
                f.write(containerization_result["docker_compose_prod"])
            
            dockerignore_path = os.path.join(project_path, ".dockerignore")
            with open(dockerignore_path, "w") as f:
                f.write(containerization_result["dockerignore"])
            
            # Build Docker image
            image_name = f"{project_name.lower().replace(' ', '-')}:latest"
            build_result = await build_docker_image(project_path, image_name)
            
            # Test the container
            test_result = await test_docker_container(image_name, port)
            
            return ContainerizationResponse(
                success=True,
                message=f"Project {project_name} containerized successfully",
                data={
                    "project_analysis": {
                        "type": analysis.project_type.value,
                        "confidence": analysis.confidence_score,
                        "package_manager": analysis.package_manager,
                        "port": analysis.port,
                        "base_image": analysis.base_image
                    },
                    "containerization": {
                        "image_name": image_name,
                        "port": port,
                        "strategy": analysis.dockerfile_strategy,
                        "files_generated": [
                            "Dockerfile",
                            "docker-compose.yml", 
                            "docker-compose.prod.yml",
                            ".dockerignore"
                        ]
                    },
                    "build_result": build_result,
                    "test_result": test_result
                }
            )
            
    except Exception as e:
        logger.error(f"Containerization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Containerization failed: {str(e)}"
        )

@router.post("/build/{image_name}", response_model=SuccessResponse, tags=["Containerization"])
async def build_docker_image_endpoint(
    image_name: str,
    project_path: str
):
    """
    Build a Docker image from a project directory
    """
    try:
        result = await build_docker_image(project_path, image_name)
        return SuccessResponse(
            message=f"Docker image {image_name} built successfully",
            data=result
        )
    except Exception as e:
        logger.error(f"Docker build failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Docker build failed: {str(e)}"
        )

@router.post("/run/{image_name}", response_model=SuccessResponse, tags=["Containerization"])
async def run_docker_container(
    image_name: str,
    port: int = 3000,
    container_name: Optional[str] = None
):
    """
    Run a Docker container
    """
    try:
        if not container_name:
            container_name = f"{image_name.replace(':', '-')}-container"
        
        result = await run_docker_container_cmd(image_name, port, container_name)
        return SuccessResponse(
            message=f"Docker container {container_name} started successfully",
            data=result
        )
    except Exception as e:
        logger.error(f"Docker run failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Docker run failed: {str(e)}"
        )

@router.get("/images", response_model=SuccessResponse, tags=["Containerization"])
async def list_docker_images():
    """
    List all Docker images
    """
    try:
        result = await list_docker_images_cmd()
        return SuccessResponse(
            message="Docker images listed successfully",
            data={"images": result}
        )
    except Exception as e:
        logger.error(f"Failed to list Docker images: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list Docker images: {str(e)}"
        )

@router.get("/containers", response_model=SuccessResponse, tags=["Containerization"])
async def list_docker_containers():
    """
    List all Docker containers
    """
    try:
        result = await list_docker_containers_cmd()
        return SuccessResponse(
            message="Docker containers listed successfully",
            data={"containers": result}
        )
    except Exception as e:
        logger.error(f"Failed to list Docker containers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list Docker containers: {str(e)}"
        )

@router.delete("/container/{container_name}", response_model=SuccessResponse, tags=["Containerization"])
async def stop_docker_container(container_name: str):
    """
    Stop and remove a Docker container
    """
    try:
        result = await stop_docker_container_cmd(container_name)
        return SuccessResponse(
            message=f"Docker container {container_name} stopped successfully",
            data=result
        )
    except Exception as e:
        logger.error(f"Failed to stop Docker container: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop Docker container: {str(e)}"
        )

# Helper functions for Docker operations
async def build_docker_image(project_path: str, image_name: str) -> Dict[str, Any]:
    """Build a Docker image"""
    try:
        cmd = ["docker", "build", "-t", image_name, project_path]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        return {
            "success": True,
            "image_name": image_name,
            "build_log": result.stdout,
            "warnings": result.stderr
        }
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": e.stderr,
            "return_code": e.returncode
        }

async def test_docker_container(image_name: str, port: int) -> Dict[str, Any]:
    """Test a Docker container by running it briefly"""
    try:
        container_name = f"{image_name.replace(':', '-')}-test"
        
        # Run container in background
        cmd = ["docker", "run", "-d", "--name", container_name, "-p", f"{port}:{port}", image_name]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Wait a moment for container to start
        import time
        time.sleep(2)
        
        # Check if container is running
        check_cmd = ["docker", "ps", "--filter", f"name={container_name}", "--format", "{{.Status}}"]
        status_result = subprocess.run(check_cmd, capture_output=True, text=True)
        
        # Stop and remove test container
        subprocess.run(["docker", "stop", container_name], capture_output=True)
        subprocess.run(["docker", "rm", container_name], capture_output=True)
        
        return {
            "success": True,
            "container_id": result.stdout.strip(),
            "status": status_result.stdout.strip(),
            "port": port
        }
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": e.stderr,
            "return_code": e.returncode
        }

async def run_docker_container_cmd(image_name: str, port: int, container_name: str) -> Dict[str, Any]:
    """Run a Docker container"""
    try:
        cmd = ["docker", "run", "-d", "--name", container_name, "-p", f"{port}:{port}", image_name]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        return {
            "success": True,
            "container_id": result.stdout.strip(),
            "container_name": container_name,
            "port": port,
            "url": f"http://localhost:{port}"
        }
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": e.stderr,
            "return_code": e.returncode
        }

async def list_docker_images_cmd() -> List[Dict[str, Any]]:
    """List Docker images"""
    try:
        # Check if Docker is available
        try:
            subprocess.run(["docker", "version"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("Docker not found or not running. Returning empty list.")
            return []
        
        cmd = ["docker", "images", "--format", "{{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}\t{{.CreatedAt}}"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        images = []
        for line in result.stdout.strip().split('\n'):
            if line:
                parts = line.split('\t')
                if len(parts) >= 4:
                    images.append({
                        "name": parts[0],
                        "id": parts[1],
                        "size": parts[2],
                        "created": parts[3]
                    })
        
        return images
    except subprocess.CalledProcessError as e:
        return []

async def list_docker_containers_cmd() -> List[Dict[str, Any]]:
    """List Docker containers"""
    try:
        # Check if Docker is available
        try:
            subprocess.run(["docker", "version"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("Docker not found or not running. Returning empty list.")
            return []
        
        cmd = ["docker", "ps", "-a", "--format", "{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        containers = []
        for line in result.stdout.strip().split('\n'):
            if line:
                parts = line.split('\t')
                if len(parts) >= 4:
                    containers.append({
                        "name": parts[0],
                        "image": parts[1],
                        "status": parts[2],
                        "ports": parts[3]
                    })
        
        return containers
    except subprocess.CalledProcessError as e:
        return []

async def stop_docker_container_cmd(container_name: str) -> Dict[str, Any]:
    """Stop and remove a Docker container"""
    try:
        # Stop container
        stop_cmd = ["docker", "stop", container_name]
        subprocess.run(stop_cmd, capture_output=True, text=True, check=True)
        
        # Remove container
        rm_cmd = ["docker", "rm", container_name]
        subprocess.run(rm_cmd, capture_output=True, text=True, check=True)
        
        return {
            "success": True,
            "container_name": container_name,
            "action": "stopped and removed"
        }
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": e.stderr,
            "return_code": e.returncode
        }
