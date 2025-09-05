"""
Application configuration settings
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "DeployHub Enhanced API"
    VERSION: str = "2.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 3001
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "https://deployhub.com",
        "https://app.deployhub.com"
    ]
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Database
    DATABASE_URL: str = "sqlite:///./deployhub.db"
    DATABASE_ECHO: bool = False
    
    # AWS Configuration
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_SESSION_TOKEN: Optional[str] = None
    
    # S3 Configuration
    S3_BUCKET_PREFIX: str = "deployhub"
    S3_DEFAULT_REGION: str = "us-east-1"
    
    # Supabase Configuration
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    # Kubernetes Configuration
    KUBECONFIG_PATH: Optional[str] = None
    K8S_NAMESPACE: str = "default"
    
    # Prefect Configuration
    PREFECT_API_URL: str = "http://localhost:4200/api"
    PREFECT_API_KEY: Optional[str] = None
    
    # Terraform Configuration
    TERRAFORM_WORKSPACE: str = "./terraform"
    TERRAFORM_STATE_BUCKET: Optional[str] = None
    TERRAFORM_STATE_KEY: str = "terraform.tfstate"
    
    # Monitoring Configuration
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    LOG_LEVEL: str = "INFO"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # Background Tasks
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # File Upload
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    UPLOAD_DIR: str = "./uploads"
    
    # Project Detection
    SUPPORTED_PROJECT_TYPES: List[str] = [
        "react", "vue", "angular", "nextjs", "nuxt", "svelte",
        "vite", "webpack", "docusaurus", "static", "unknown"
    ]
    
    # Containerization
    DEFAULT_DOCKER_REGISTRY: str = "docker.io"
    DEFAULT_BASE_IMAGES: dict = {
        "node": "node:18-alpine",
        "python": "python:3.11-slim",
        "java": "openjdk:17-jre-slim",
        "go": "golang:1.21-alpine",
        "rust": "rust:1.75-slim",
        "php": "php:8.2-fpm-alpine",
        "ruby": "ruby:3.2-alpine"
    }
    
    # Scaling Configuration
    DEFAULT_MIN_REPLICAS: int = 1
    DEFAULT_MAX_REPLICAS: int = 10
    DEFAULT_TARGET_CPU_UTILIZATION: int = 70
    DEFAULT_TARGET_MEMORY_UTILIZATION: int = 80
    
    # Deployment Strategies
    DEFAULT_DEPLOYMENT_STRATEGY: str = "rolling"
    BLUE_GREEN_TIMEOUT: int = 600  # seconds
    CANARY_DURATION: int = 300  # seconds
    ROLLING_UPDATE_MAX_UNAVAILABLE: int = 1
    ROLLING_UPDATE_MAX_SURGE: int = 1
    
    # Infrastructure as Code
    TERRAFORM_MODULES_DIR: str = "./terraform/modules"
    TERRAFORM_TEMPLATES_DIR: str = "./terraform/templates"
    
    # Monitoring and Alerting
    CLOUDWATCH_LOG_GROUP: str = "/deployhub"
    CLOUDWATCH_LOG_RETENTION_DAYS: int = 30
    PROMETHEUS_ENDPOINT: Optional[str] = None
    GRAFANA_ENDPOINT: Optional[str] = None
    
    # Notification
    SLACK_WEBHOOK_URL: Optional[str] = None
    DISCORD_WEBHOOK_URL: Optional[str] = None
    EMAIL_SMTP_HOST: Optional[str] = None
    EMAIL_SMTP_PORT: int = 587
    EMAIL_SMTP_USER: Optional[str] = None
    EMAIL_SMTP_PASSWORD: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Global settings instance
settings = Settings()

# Create necessary directories
def create_directories():
    """Create necessary directories if they don't exist"""
    directories = [
        settings.UPLOAD_DIR,
        settings.TERRAFORM_WORKSPACE,
        settings.TERRAFORM_MODULES_DIR,
        settings.TERRAFORM_TEMPLATES_DIR,
        "./logs"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)

# Initialize directories
create_directories()
