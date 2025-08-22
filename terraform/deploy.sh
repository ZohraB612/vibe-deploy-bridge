#!/bin/bash

# 🚀 DeployHub Terraform Deployment Script
# This script automates the Terraform deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install Terraform first."
        exit 1
    fi
    
    # Check Terraform version
    TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version')
    print_status "Terraform version: $TERRAFORM_VERSION"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Get AWS account info
    AWS_ACCOUNT=$(aws sts get-caller-identity --query 'Account' --output text)
    AWS_USER=$(aws sts get-caller-identity --query 'Arn' --output text)
    print_status "AWS Account: $AWS_ACCOUNT"
    print_status "AWS User: $AWS_USER"
    
    print_success "Prerequisites check passed!"
}

# Function to initialize Terraform
init_terraform() {
    print_status "Initializing Terraform..."
    
    if [ ! -f "terraform.tfvars" ]; then
        print_warning "terraform.tfvars not found. Creating from example..."
        if [ -f "terraform.tfvars.example" ]; then
            cp terraform.tfvars.example terraform.tfvars
            print_warning "Please edit terraform.tfvars with your project details before continuing."
            read -p "Press Enter when you're ready to continue..."
        else
            print_error "terraform.tfvars.example not found. Please create terraform.tfvars manually."
            exit 1
        fi
    fi
    
    terraform init
    print_success "Terraform initialized successfully!"
}

# Function to plan deployment
plan_deployment() {
    print_status "Planning deployment..."
    
    terraform plan -out=tfplan
    print_success "Deployment plan created successfully!"
}

# Function to apply deployment
apply_deployment() {
    print_status "Applying deployment..."
    
    if [ ! -f "tfplan" ]; then
        print_warning "No plan file found. Running terraform plan first..."
        plan_deployment
    fi
    
    terraform apply tfplan
    print_success "Deployment applied successfully!"
}

# Function to show outputs
show_outputs() {
    print_status "Deployment outputs:"
    echo ""
    terraform output
    echo ""
    
    # Show primary URL
    PRIMARY_URL=$(terraform output -raw primary_url 2>/dev/null || echo "Not available")
    if [ "$PRIMARY_URL" != "Not available" ]; then
        print_success "Your application is available at: $PRIMARY_URL"
    fi
}

# Function to upload files (if S3 bucket is available)
upload_files() {
    print_status "Checking if file upload is needed..."
    
    # Check if dist directory exists
    if [ ! -d "../dist" ]; then
        print_warning "No dist/ directory found. Skipping file upload."
        return
    fi
    
    # Get S3 bucket name from Terraform output
    S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
    
    if [ -z "$S3_BUCKET" ]; then
        print_warning "S3 bucket not available. Skipping file upload."
        return
    fi
    
    print_status "Uploading files to S3 bucket: $S3_BUCKET"
    
    # Upload files
    aws s3 sync ../dist/ s3://$S3_BUCKET/ --delete
    
    print_success "Files uploaded successfully!"
    
    # Invalidate CloudFront if enabled
    CLOUDFRONT_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
    if [ ! -z "$CLOUDFRONT_ID" ]; then
        print_status "Creating CloudFront invalidation..."
        aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
        print_success "CloudFront invalidation created!"
    fi
}

# Function to destroy infrastructure
destroy_infrastructure() {
    print_warning "This will destroy all infrastructure and data!"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        print_status "Destroying infrastructure..."
        terraform destroy -auto-approve
        print_success "Infrastructure destroyed successfully!"
    else
        print_status "Destroy cancelled."
    fi
}

# Function to show help
show_help() {
    echo "🚀 DeployHub Terraform Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy     - Full deployment (init, plan, apply, upload)"
    echo "  init       - Initialize Terraform"
    echo "  plan       - Plan deployment"
    echo "  apply      - Apply deployment"
    echo "  upload     - Upload files to S3"
    echo "  destroy    - Destroy infrastructure"
    echo "  status     - Show deployment status and outputs"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy     # Full deployment"
    echo "  $0 plan       # Just plan the deployment"
    echo "  $0 destroy    # Remove all infrastructure"
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        print_status "Starting full deployment process..."
        check_prerequisites
        init_terraform
        plan_deployment
        apply_deployment
        show_outputs
        upload_files
        print_success "Deployment completed successfully! 🎉"
        ;;
    "init")
        check_prerequisites
        init_terraform
        ;;
    "plan")
        check_prerequisites
        init_terraform
        plan_deployment
        ;;
    "apply")
        check_prerequisites
        apply_deployment
        show_outputs
        ;;
    "upload")
        check_prerequisites
        upload_files
        ;;
    "destroy")
        check_prerequisites
        destroy_infrastructure
        ;;
    "status")
        check_prerequisites
        show_outputs
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
