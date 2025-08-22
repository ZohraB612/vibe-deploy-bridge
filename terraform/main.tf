terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend configuration for state management
  backend "s3" {
    # This will be configured per deployment
    # bucket = "deployhub-terraform-state"
    # key    = "deployhub/terraform.tfstate"
    # region = "us-east-1"
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "DeployHub"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = var.project_owner
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_owner" {
  description = "Project owner/team name"
  type        = string
  default     = "deployhub"
}

variable "project_name" {
  description = "Name of the project to deploy"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the project (optional)"
  type        = string
  default     = ""
}

variable "enable_ssl" {
  description = "Enable SSL certificate"
  type        = bool
  default     = true
}

variable "enable_cloudfront" {
  description = "Enable CloudFront distribution"
  type        = bool
  default     = true
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local values
locals {
  # Resource naming convention
  name_prefix = "deployhub-${var.project_name}"
  
  # Common tags
  common_tags = {
    Project     = "DeployHub"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = var.project_owner
    ProjectName = var.project_name
  }
  
  # S3 bucket configuration
  s3_bucket_name = "${local.name_prefix}-${formatdate("YYYYMMDD-HHmmss", timestamp())}"
  
  # CloudFront configuration
  cloudfront_comment = "DeployHub distribution for ${var.project_name}"
}
