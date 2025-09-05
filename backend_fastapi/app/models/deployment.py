"""Deployment database models"""

from sqlalchemy import Column, String, DateTime, Text, JSON, Integer, Boolean
from sqlalchemy.sql import func
from app.core.database import Base

class Deployment(Base):
    """Deployment model"""
    __tablename__ = "deployments"
    
    id = Column(String, primary_key=True, index=True)
    project_name = Column(String, nullable=False, index=True)
    project_type = Column(String, nullable=False)
    environment = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    url = Column(String, nullable=True)
    logs = Column(JSON, nullable=True)
    errors = Column(JSON, nullable=True)
    resources_created = Column(JSON, nullable=True)
    resources_failed = Column(JSON, nullable=True)
    monitoring_enabled = Column(Boolean, default=False)
    metrics_url = Column(String, nullable=True)
    logs_url = Column(String, nullable=True)
    options = Column(JSON, nullable=True)
