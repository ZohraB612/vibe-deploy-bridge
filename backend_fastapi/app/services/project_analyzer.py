"""
Project Analysis Service
Analyzes uploaded projects to determine type, dependencies, and containerization strategy
"""

import os
import json
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from app.core.logging import get_logger
from app.schemas.base import ProjectType

logger = get_logger(__name__)

@dataclass
class ProjectAnalysis:
    """Project analysis result"""
    project_type: ProjectType
    framework_version: Optional[str]
    package_manager: str
    build_command: Optional[str]
    output_dir: Optional[str]
    dependencies: List[str]
    environment_vars: Dict[str, str]
    port: int
    health_check: Optional[Dict[str, Any]]
    dockerfile_strategy: str
    base_image: str
    confidence_score: float

class ProjectAnalyzer:
    """Analyzes projects to determine deployment strategy"""
    
    def __init__(self):
        self.project_indicators = {
            "react": {
                "files": ["package.json", "src/App.js", "src/App.jsx", "src/index.js"],
                "keywords": ["react", "react-dom"],
                "scripts": ["start", "build"],
                "base_image": "node:18-alpine",
                "port": 3000
            },
            "vue": {
                "files": ["package.json", "src/App.vue", "src/main.js"],
                "keywords": ["vue", "@vue/cli"],
                "scripts": ["serve", "build"],
                "base_image": "node:18-alpine",
                "port": 8080
            },
            "angular": {
                "files": ["package.json", "src/app/app.component.ts", "angular.json"],
                "keywords": ["@angular/core", "@angular/cli"],
                "scripts": ["start", "build"],
                "base_image": "node:18-alpine",
                "port": 4200
            },
            "nextjs": {
                "files": ["package.json", "next.config.js", "pages/", "app/"],
                "keywords": ["next", "react"],
                "scripts": ["dev", "build", "start"],
                "base_image": "node:18-alpine",
                "port": 3000
            },
            "nuxt": {
                "files": ["package.json", "nuxt.config.js", "pages/"],
                "keywords": ["nuxt", "vue"],
                "scripts": ["dev", "build", "start"],
                "base_image": "node:18-alpine",
                "port": 3000
            },
            "svelte": {
                "files": ["package.json", "src/App.svelte", "svelte.config.js"],
                "keywords": ["svelte", "sveltekit"],
                "scripts": ["dev", "build"],
                "base_image": "node:18-alpine",
                "port": 5173
            },
            "python": {
                "files": ["requirements.txt", "main.py", "app.py", "manage.py"],
                "keywords": ["flask", "django", "fastapi", "streamlit"],
                "scripts": [],
                "base_image": "python:3.11-slim",
                "port": 8000
            },
            "java": {
                "files": ["pom.xml", "build.gradle", "src/main/java/"],
                "keywords": ["spring", "maven", "gradle"],
                "scripts": [],
                "base_image": "openjdk:17-jre-slim",
                "port": 8080
            },
            "go": {
                "files": ["go.mod", "main.go", "go.sum"],
                "keywords": ["gin", "echo", "fiber"],
                "scripts": [],
                "base_image": "golang:1.21-alpine",
                "port": 8080
            },
            "rust": {
                "files": ["Cargo.toml", "src/main.rs"],
                "keywords": ["actix", "warp", "rocket"],
                "scripts": [],
                "base_image": "rust:1.75-slim",
                "port": 8080
            },
            "php": {
                "files": ["composer.json", "index.php", "public/"],
                "keywords": ["laravel", "symfony", "wordpress"],
                "scripts": [],
                "base_image": "php:8.2-fpm-alpine",
                "port": 80
            },
            "static": {
                "files": ["index.html", "css/", "js/", "assets/"],
                "keywords": [],
                "scripts": [],
                "base_image": "nginx:alpine",
                "port": 80
            }
        }
    
    async def analyze_project(self, project_path: str) -> ProjectAnalysis:
        """
        Analyze a project directory to determine its type and deployment strategy
        
        Args:
            project_path: Path to the project directory
            
        Returns:
            ProjectAnalysis object with detected project information
        """
        try:
            logger.info(f"Analyzing project at: {project_path}")
            
            # Check if project path exists
            if not os.path.exists(project_path):
                raise FileNotFoundError(f"Project path does not exist: {project_path}")
            
            # Read project files
            project_files = await self._read_project_files(project_path)
            
            # Analyze package.json or similar config files
            config_data = await self._read_config_files(project_path)
            
            # Detect project type
            project_type, confidence = await self._detect_project_type(project_files, config_data)
            
            # Get project-specific configuration
            project_config = self.project_indicators.get(project_type.value, self.project_indicators["static"])
            
            # Determine build strategy
            build_command, output_dir = await self._determine_build_strategy(
                project_path, project_type, config_data
            )
            
            # Extract dependencies
            dependencies = await self._extract_dependencies(config_data, project_type)
            
            # Determine environment variables
            environment_vars = await self._determine_environment_vars(project_type, config_data)
            
            # Determine health check strategy
            health_check = await self._determine_health_check(project_type, project_config)
            
            # Determine Dockerfile strategy
            dockerfile_strategy = await self._determine_dockerfile_strategy(project_type, config_data)
            
            analysis = ProjectAnalysis(
                project_type=project_type,
                framework_version=config_data.get("version"),
                package_manager=config_data.get("package_manager", "npm"),
                build_command=build_command,
                output_dir=output_dir,
                dependencies=dependencies,
                environment_vars=environment_vars,
                port=project_config["port"],
                health_check=health_check,
                dockerfile_strategy=dockerfile_strategy,
                base_image=project_config["base_image"],
                confidence_score=confidence
            )
            
            logger.info(f"Project analysis complete: {project_type.value} (confidence: {confidence:.2f})")
            return analysis
            
        except Exception as e:
            logger.error(f"Project analysis failed: {e}")
            raise
    
    async def _read_project_files(self, project_path: str) -> List[str]:
        """Read all files in the project directory"""
        files = []
        for root, dirs, filenames in os.walk(project_path):
            # Skip node_modules, .git, and other common directories
            dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', '.next', 'dist', 'build'}]
            for filename in filenames:
                files.append(os.path.join(root, filename))
        return files
    
    async def _read_config_files(self, project_path: str) -> Dict[str, Any]:
        """Read configuration files like package.json, requirements.txt, etc."""
        config_data = {}
        
        # Read package.json
        package_json_path = os.path.join(project_path, "package.json")
        if os.path.exists(package_json_path):
            try:
                with open(package_json_path, 'r') as f:
                    package_data = json.load(f)
                    config_data.update({
                        "name": package_data.get("name"),
                        "version": package_data.get("version"),
                        "scripts": package_data.get("scripts", {}),
                        "dependencies": package_data.get("dependencies", {}),
                        "devDependencies": package_data.get("devDependencies", {}),
                        "package_manager": "npm"
                    })
            except Exception as e:
                logger.warning(f"Failed to read package.json: {e}")
        
        # Read requirements.txt
        requirements_path = os.path.join(project_path, "requirements.txt")
        if os.path.exists(requirements_path):
            try:
                with open(requirements_path, 'r') as f:
                    requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
                    config_data["python_dependencies"] = requirements
                    config_data["package_manager"] = "pip"
            except Exception as e:
                logger.warning(f"Failed to read requirements.txt: {e}")
        
        # Read Cargo.toml
        cargo_path = os.path.join(project_path, "Cargo.toml")
        if os.path.exists(cargo_path):
            try:
                with open(cargo_path, 'r') as f:
                    cargo_data = yaml.safe_load(f)
                    config_data["rust_dependencies"] = cargo_data.get("dependencies", {})
                    config_data["package_manager"] = "cargo"
            except Exception as e:
                logger.warning(f"Failed to read Cargo.toml: {e}")
        
        return config_data
    
    async def _detect_project_type(self, files: List[str], config_data: Dict[str, Any]) -> Tuple[ProjectType, float]:
        """Detect the project type based on files and configuration"""
        scores = {}
        
        for project_type, indicators in self.project_indicators.items():
            score = 0.0
            
            # Check for required files
            file_matches = sum(1 for file in indicators["files"] if any(file in f for f in files))
            if file_matches > 0:
                score += (file_matches / len(indicators["files"])) * 0.4
            
            # Check for keywords in dependencies
            dependencies = config_data.get("dependencies", {})
            dev_dependencies = config_data.get("devDependencies", {})
            all_deps = {**dependencies, **dev_dependencies}
            
            keyword_matches = sum(1 for keyword in indicators["keywords"] 
                                if any(keyword in dep.lower() for dep in all_deps.keys()))
            if keyword_matches > 0:
                score += (keyword_matches / len(indicators["keywords"])) * 0.4
            
            # Check for build scripts
            scripts = config_data.get("scripts", {})
            script_matches = sum(1 for script in indicators["scripts"] if script in scripts)
            if script_matches > 0:
                score += (script_matches / len(indicators["scripts"])) * 0.2
            
            scores[project_type] = score
        
        # Find the best match
        best_type = max(scores, key=scores.get)
        confidence = scores[best_type]
        
        # If confidence is too low, default to static
        if confidence < 0.3:
            return ProjectType.STATIC, 0.3
        
        return ProjectType(best_type), confidence
    
    async def _determine_build_strategy(self, project_path: str, project_type: ProjectType, config_data: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        """Determine the build command and output directory"""
        scripts = config_data.get("scripts", {})
        
        if project_type in [ProjectType.REACT, ProjectType.VUE, ProjectType.ANGULAR, ProjectType.NEXTJS, ProjectType.NUXT, ProjectType.SVELTE]:
            # Frontend frameworks
            if "build" in scripts:
                build_command = "npm run build"
            else:
                build_command = "npm run build"
            
            # Determine output directory
            if project_type == ProjectType.NEXTJS:
                output_dir = ".next"
            elif project_type == ProjectType.NUXT:
                output_dir = ".nuxt"
            elif project_type == ProjectType.SVELTE:
                output_dir = "build"
            else:
                output_dir = "dist"
            
            return build_command, output_dir
        
        elif project_type == ProjectType.PYTHON:
            # Python projects
            if "requirements.txt" in os.listdir(project_path):
                return "pip install -r requirements.txt", None
            return None, None
        
        elif project_type == ProjectType.JAVA:
            # Java projects
            if "pom.xml" in os.listdir(project_path):
                return "mvn clean package", "target"
            elif "build.gradle" in os.listdir(project_path):
                return "./gradlew build", "build"
            return None, None
        
        elif project_type == ProjectType.GO:
            # Go projects
            return "go build -o main .", None
        
        elif project_type == ProjectType.RUST:
            # Rust projects
            return "cargo build --release", "target/release"
        
        else:
            # Static or unknown
            return None, None
    
    async def _extract_dependencies(self, config_data: Dict[str, Any], project_type: ProjectType) -> List[str]:
        """Extract project dependencies"""
        dependencies = []
        
        if project_type in [ProjectType.REACT, ProjectType.VUE, ProjectType.ANGULAR, ProjectType.NEXTJS, ProjectType.NUXT, ProjectType.SVELTE]:
            deps = config_data.get("dependencies", {})
            dev_deps = config_data.get("devDependencies", {})
            dependencies.extend(list(deps.keys()))
            dependencies.extend(list(dev_deps.keys()))
        
        elif project_type == ProjectType.PYTHON:
            deps = config_data.get("python_dependencies", [])
            dependencies.extend(deps)
        
        elif project_type == ProjectType.RUST:
            deps = config_data.get("rust_dependencies", {})
            dependencies.extend(list(deps.keys()))
        
        return dependencies
    
    async def _determine_environment_vars(self, project_type: ProjectType, config_data: Dict[str, Any]) -> Dict[str, str]:
        """Determine required environment variables"""
        env_vars = {}
        
        if project_type in [ProjectType.REACT, ProjectType.VUE, ProjectType.ANGULAR, ProjectType.NEXTJS, ProjectType.NUXT, ProjectType.SVELTE]:
            env_vars["NODE_ENV"] = "production"
            env_vars["PORT"] = "3000"
        
        elif project_type == ProjectType.PYTHON:
            env_vars["PYTHONPATH"] = "/app"
            env_vars["PORT"] = "8000"
        
        elif project_type == ProjectType.JAVA:
            env_vars["JAVA_OPTS"] = "-Xmx512m"
            env_vars["PORT"] = "8080"
        
        elif project_type == ProjectType.GO:
            env_vars["PORT"] = "8080"
        
        elif project_type == ProjectType.RUST:
            env_vars["PORT"] = "8080"
        
        return env_vars
    
    async def _determine_health_check(self, project_type: ProjectType, project_config: Dict[str, Any]) -> Dict[str, Any]:
        """Determine health check configuration"""
        port = project_config["port"]
        
        if project_type in [ProjectType.REACT, ProjectType.VUE, ProjectType.ANGULAR, ProjectType.NEXTJS, ProjectType.NUXT, ProjectType.SVELTE]:
            return {
                "test": f"curl -f http://localhost:{port}/ || exit 1",
                "interval": "30s",
                "timeout": "10s",
                "retries": 3
            }
        
        elif project_type == ProjectType.PYTHON:
            return {
                "test": f"curl -f http://localhost:{port}/health || exit 1",
                "interval": "30s",
                "timeout": "10s",
                "retries": 3
            }
        
        else:
            return {
                "test": f"curl -f http://localhost:{port}/ || exit 1",
                "interval": "30s",
                "timeout": "10s",
                "retries": 3
            }
    
    async def _determine_dockerfile_strategy(self, project_type: ProjectType, config_data: Dict[str, Any]) -> str:
        """Determine the best Dockerfile strategy for the project"""
        if project_type in [ProjectType.REACT, ProjectType.VUE, ProjectType.ANGULAR]:
            return "multi-stage-build"
        elif project_type in [ProjectType.NEXTJS, ProjectType.NUXT]:
            return "nextjs-optimized"
        elif project_type == ProjectType.PYTHON:
            return "python-optimized"
        elif project_type == ProjectType.JAVA:
            return "java-optimized"
        elif project_type == ProjectType.GO:
            return "go-optimized"
        elif project_type == ProjectType.RUST:
            return "rust-optimized"
        else:
            return "simple"
