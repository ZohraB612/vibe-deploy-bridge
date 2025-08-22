# 🚀 DeployHub Terraform Infrastructure

This directory contains the Terraform configuration for DeployHub's AWS infrastructure. We've migrated from CloudFormation to Terraform for better multi-cloud support, state management, and developer experience.

## 📁 **File Structure**

```
terraform/
├── main.tf              # Main configuration and variables
├── s3.tf                # S3 bucket and website hosting
├── cloudfront.tf        # CloudFront CDN distribution
├── ssl-dns.tf           # SSL certificates and DNS management
├── monitoring.tf        # CloudWatch monitoring and alerts
├── outputs.tf           # Output values and information
├── terraform.tfvars.example  # Example configuration
└── README.md            # This file
```

## 🚀 **Quick Start**

### **1. Prerequisites**
- [Terraform](https://www.terraform.io/downloads) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) configured
- AWS credentials with appropriate permissions

### **2. Configure Your Project**
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project details
```

### **3. Initialize Terraform**
```bash
terraform init
```

### **4. Plan Your Deployment**
```bash
terraform plan
```

### **5. Deploy Your Infrastructure**
```bash
terraform apply
```

### **6. Clean Up (When Done)**
```bash
terraform destroy
```

## ⚙️ **Configuration Options**

### **Basic Configuration**
```hcl
project_name = "my-react-app"
environment  = "dev"
aws_region  = "us-east-1"
```

### **With Custom Domain**
```hcl
project_name = "my-app"
domain_name  = "myapp.com"
enable_ssl   = true
```

### **S3 Only (No CloudFront)**
```hcl
enable_cloudfront = false
```

## 🏗️ **What Gets Created**

### **Core Infrastructure**
- ✅ **S3 Bucket** - Static website hosting
- ✅ **CloudFront Distribution** - Global CDN
- ✅ **SSL Certificate** - HTTPS support (if domain provided)
- ✅ **DNS Records** - Domain management (if domain provided)

### **Monitoring & Logging**
- ✅ **CloudWatch Dashboard** - Performance metrics
- ✅ **CloudWatch Alarms** - Error rate and latency alerts
- ✅ **Log Groups** - Application and access logs

### **Security Features**
- ✅ **Resource Isolation** - All resources prefixed with `deployhub-`
- ✅ **IAM Policies** - Least privilege access
- ✅ **SSL/TLS** - Modern security standards
- ✅ **CORS Configuration** - Web security headers

## 🔐 **Security & Compliance**

### **Resource Naming Convention**
All resources follow the pattern: `deployhub-{project}-{timestamp}`
- **S3 Buckets**: `deployhub-myapp-20241201-143022`
- **CloudFormation Stacks**: `deployhub-myapp-stack`
- **Log Groups**: `/aws/deployhub/myapp/*`

### **Access Control**
- **S3**: Public read access for website hosting
- **CloudFront**: Global CDN with HTTPS
- **Monitoring**: Project-scoped CloudWatch resources
- **DNS**: Route53 management (if domain provided)

## 💰 **Cost Optimization**

### **CloudFront Price Class**
- **PriceClass_100**: North America and Europe only
- **PriceClass_200**: North America, Europe, Asia, Middle East, and Africa
- **PriceClass_All**: All locations (most expensive)

### **S3 Storage Classes**
- **Standard**: Immediate access, highest cost
- **Intelligent Tiering**: Automatic cost optimization
- **Lifecycle Policies**: Automatic cleanup of old files

### **Estimated Monthly Costs**
- **Small Project** (< 1GB): $1-3/month
- **Medium Project** (1-10GB): $3-8/month
- **Large Project** (10+GB): $8+/month

## 🔄 **Deployment Workflow**

### **1. Infrastructure Creation**
```bash
terraform apply
# Creates: S3, CloudFront, SSL, DNS, Monitoring
```

### **2. File Upload**
```bash
aws s3 sync ./dist/ s3://deployhub-myapp-1234567890/
```

### **3. CloudFront Invalidation**
```bash
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### **4. Domain Verification** (if custom domain)
- DNS records are created automatically
- SSL certificate validation happens automatically
- Wait 5-10 minutes for propagation

## 🚨 **Troubleshooting**

### **Common Issues**

#### **SSL Certificate Pending**
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn arn:aws:acm:...

# Verify DNS records are correct
aws route53 list-resource-record-sets --hosted-zone-id Z1234567890ABC
```

#### **CloudFront Not Working**
```bash
# Check distribution status
aws cloudfront get-distribution --id E1234567890ABC

# Create invalidation
aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
```

#### **S3 Access Denied**
```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket deployhub-myapp-1234567890

# Check public access settings
aws s3api get-public-access-block --bucket deployhub-myapp-1234567890
```

### **Useful Commands**
```bash
# View all outputs
terraform output

# View specific output
terraform output primary_url

# Check resource status
terraform show

# Validate configuration
terraform validate
```

## 🔄 **Updating Infrastructure**

### **Modify Configuration**
1. Edit the `.tf` files
2. Run `terraform plan` to see changes
3. Run `terraform apply` to apply changes

### **Add New Resources**
1. Add new resource blocks to appropriate `.tf` files
2. Run `terraform plan` to verify
3. Run `terraform apply` to create

### **Remove Resources**
1. Comment out or delete resource blocks
2. Run `terraform plan` to see what will be removed
3. Run `terraform apply` to destroy resources

## 🚀 **Advanced Features**

### **Multi-Environment Support**
```bash
# Development
terraform workspace new dev
terraform apply -var="environment=dev"

# Staging
terraform workspace new staging
terraform apply -var="environment=staging"

# Production
terraform workspace new prod
terraform apply -var="environment=prod"
```

### **Remote State Management**
```bash
# Configure S3 backend
terraform init -backend-config="bucket=deployhub-terraform-state" \
               -backend-config="key=deployhub/terraform.tfstate" \
               -backend-config="region=us-east-1"
```

### **Custom Variables**
```bash
# Override variables
terraform apply -var="project_name=custom-app" \
               -var="aws_region=eu-west-1"
```

## 📚 **Next Steps**

### **Immediate**
1. **Test the infrastructure** with a simple HTML file
2. **Configure monitoring alerts** in CloudWatch
3. **Set up CI/CD pipeline** for automatic deployments

### **Future Enhancements**
1. **Multi-region deployments** for global performance
2. **Advanced monitoring** with custom metrics
3. **Automated scaling** based on traffic patterns
4. **Backup and disaster recovery** procedures

---

## 🎯 **Why Terraform?**

### **Advantages Over CloudFormation**
- ✅ **Multi-cloud support** (AWS, GCP, Azure, etc.)
- ✅ **Better state management** and collaboration
- ✅ **HCL syntax** - more readable than JSON
- ✅ **Rich ecosystem** of providers and modules
- ✅ **Plan/Apply workflow** - see changes before applying

### **Perfect for DeployHub**
- 🚀 **Professional deployment experience**
- 🔒 **Enterprise-grade security**
- 📊 **Comprehensive monitoring**
- 💰 **Cost optimization**
- 🌍 **Global CDN performance**

---

*This Terraform infrastructure makes DeployHub production-ready and enterprise-compliant! 🎯*
