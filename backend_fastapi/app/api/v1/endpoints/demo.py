"""
Demo endpoints to showcase DeployHub functionality
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any
from app.schemas.base import SuccessResponse
from app.core.logging import get_logger
from app.services.project_analyzer import ProjectAnalyzer
from app.services.containerization_service import ContainerizationService
import tempfile
import os
import json

router = APIRouter()
logger = get_logger(__name__)

@router.get("/analyze-project/{project_type}", response_model=SuccessResponse, tags=["Demo"])
async def demo_project_analysis(project_type: str):
    """
    Demo project analysis for different project types
    """
    try:
        # Create a temporary project directory with sample files
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create sample project files based on type
            await create_sample_project(temp_dir, project_type)
            
            # Analyze the project
            analyzer = ProjectAnalyzer()
            analysis = await analyzer.analyze_project(temp_dir)
            
            return SuccessResponse(
                message=f"Project analysis completed for {project_type}",
                data={
                    "project_type": analysis.project_type.value,
                    "framework_version": analysis.framework_version,
                    "package_manager": analysis.package_manager,
                    "build_command": analysis.build_command,
                    "output_dir": analysis.output_dir,
                    "dependencies": analysis.dependencies[:10],  # First 10 dependencies
                    "environment_vars": analysis.environment_vars,
                    "port": analysis.port,
                    "base_image": analysis.base_image,
                    "dockerfile_strategy": analysis.dockerfile_strategy,
                    "confidence_score": analysis.confidence_score
                }
            )
    except Exception as e:
        logger.error(f"Demo project analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demo failed: {str(e)}"
        )

@router.get("/containerize/{project_type}", response_model=SuccessResponse, tags=["Demo"])
async def demo_containerization(project_type: str):
    """
    Demo containerization for different project types
    """
    try:
        # Create a temporary project directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create sample project files
            await create_sample_project(temp_dir, project_type)
            
            # Analyze the project
            analyzer = ProjectAnalyzer()
            analysis = await analyzer.analyze_project(temp_dir)
            
            # Containerize the project
            containerization_service = ContainerizationService()
            containerization_result = await containerization_service.containerize_project(analysis, temp_dir)
            
            return SuccessResponse(
                message=f"Containerization completed for {project_type}",
                data={
                    "project_type": analysis.project_type.value,
                    "image_name": containerization_result["image_name"],
                    "port": containerization_result["port"],
                    "base_image": containerization_result["base_image"],
                    "strategy": containerization_result["strategy"],
                    "dockerfile_preview": containerization_result["dockerfile"][:500] + "..." if len(containerization_result["dockerfile"]) > 500 else containerization_result["dockerfile"],
                    "docker_compose_preview": containerization_result["docker_compose"][:300] + "..." if len(containerization_result["docker_compose"]) > 300 else containerization_result["docker_compose"]
                }
            )
    except Exception as e:
        logger.error(f"Demo containerization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demo failed: {str(e)}"
        )

@router.get("/full-deployment-flow/{project_type}", response_model=SuccessResponse, tags=["Demo"])
async def demo_full_deployment_flow(project_type: str):
    """
    Demo the complete deployment flow for a project type
    """
    try:
        # Create a temporary project directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create sample project files
            await create_sample_project(temp_dir, project_type)
            
            # Step 1: Analyze the project
            analyzer = ProjectAnalyzer()
            analysis = await analyzer.analyze_project(temp_dir)
            
            # Step 2: Containerize the project
            containerization_service = ContainerizationService()
            containerization_result = await containerization_service.containerize_project(analysis, temp_dir)
            
            # Step 3: Simulate deployment steps
            deployment_steps = [
                {
                    "step": "Project Analysis",
                    "status": "completed",
                    "details": f"Detected {analysis.project_type.value} project with {analysis.confidence_score:.2f} confidence"
                },
                {
                    "step": "Containerization",
                    "status": "completed",
                    "details": f"Generated Dockerfile using {analysis.base_image} base image"
                },
                {
                    "step": "Build Process",
                    "status": "completed",
                    "details": f"Build command: {analysis.build_command or 'N/A'}"
                },
                {
                    "step": "Cloud Deployment",
                    "status": "completed",
                    "details": "Deployed to AWS S3 + CloudFront"
                },
                {
                    "step": "Monitoring Setup",
                    "status": "completed",
                    "details": "CloudWatch logs and metrics configured"
                }
            ]
            
            return SuccessResponse(
                message=f"Complete deployment flow demo for {project_type}",
                data={
                    "project_analysis": {
                        "type": analysis.project_type.value,
                        "confidence": analysis.confidence_score,
                        "package_manager": analysis.package_manager,
                        "port": analysis.port,
                        "base_image": analysis.base_image
                    },
                    "containerization": {
                        "image_name": containerization_result["image_name"],
                        "strategy": containerization_result["strategy"],
                        "files_generated": ["Dockerfile", "docker-compose.yml", "docker-compose.prod.yml", ".dockerignore"]
                    },
                    "deployment_steps": deployment_steps,
                    "final_url": f"https://{project_type}-demo.deployhub.com",
                    "monitoring_url": f"https://metrics.deployhub.com/{project_type}-demo"
                }
            )
    except Exception as e:
        logger.error(f"Demo full deployment flow failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demo failed: {str(e)}"
        )

async def create_sample_project(project_dir: str, project_type: str):
    """Create sample project files for demo purposes"""
    
    if project_type == "react":
        # Create package.json
        package_json = {
            "name": "react-demo-app",
            "version": "1.0.0",
            "scripts": {
                "start": "react-scripts start",
                "build": "react-scripts build",
                "test": "react-scripts test"
            },
            "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "react-scripts": "5.0.1"
            }
        }
        
        with open(os.path.join(project_dir, "package.json"), "w") as f:
            json.dump(package_json, f, indent=2)
        
        # Create src directory and files
        os.makedirs(os.path.join(project_dir, "src"), exist_ok=True)
        with open(os.path.join(project_dir, "src", "App.js"), "w") as f:
            f.write("import React from 'react';\n\nexport default function App() {\n  return <div>Hello React!</div>;\n}")
        
        with open(os.path.join(project_dir, "src", "index.js"), "w") as f:
            f.write("import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(<App />);")
    
    elif project_type == "vue":
        package_json = {
            "name": "vue-demo-app",
            "version": "1.0.0",
            "scripts": {
                "serve": "vue-cli-service serve",
                "build": "vue-cli-service build"
            },
            "dependencies": {
                "vue": "^3.2.0",
                "@vue/cli-service": "^5.0.0"
            }
        }
        
        with open(os.path.join(project_dir, "package.json"), "w") as f:
            json.dump(package_json, f, indent=2)
        
        os.makedirs(os.path.join(project_dir, "src"), exist_ok=True)
        with open(os.path.join(project_dir, "src", "App.vue"), "w") as f:
            f.write("<template><div>Hello Vue!</div></template>")
    
    elif project_type == "python":
        # Create requirements.txt
        with open(os.path.join(project_dir, "requirements.txt"), "w") as f:
            f.write("flask==2.3.0\nrequests==2.31.0\n")
        
        # Create main.py
        with open(os.path.join(project_dir, "main.py"), "w") as f:
            f.write("from flask import Flask\n\napp = Flask(__name__)\n\n@app.route('/')\ndef hello():\n    return 'Hello Python!'\n\nif __name__ == '__main__':\n    app.run(host='0.0.0.0', port=8000)")
    
    elif project_type == "static":
        # Create index.html
        with open(os.path.join(project_dir, "index.html"), "w") as f:
            f.write("<!DOCTYPE html>\n<html>\n<head><title>Static Site</title></head>\n<body><h1>Hello Static Site!</h1></body>\n</html>")
        
        # Create CSS directory
        os.makedirs(os.path.join(project_dir, "css"), exist_ok=True)
        with open(os.path.join(project_dir, "css", "style.css"), "w") as f:
            f.write("body { font-family: Arial, sans-serif; }")
    
    else:
        # Generic project
        package_json = {
            "name": f"{project_type}-demo-app",
            "version": "1.0.0",
            "scripts": {
                "start": "node index.js",
                "build": "echo 'Building...'"
            },
            "dependencies": {
                "express": "^4.18.0"
            }
        }
        
        with open(os.path.join(project_dir, "package.json"), "w") as f:
            json.dump(package_json, f, indent=2)
        
        with open(os.path.join(project_dir, "index.js"), "w") as f:
            f.write("console.log('Hello World!');")
