# Main Outputs
output "project_name" {
  description = "Name of the deployed project"
  value       = var.project_name
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "aws_region" {
  description = "AWS region used for deployment"
  value       = var.aws_region
}

# Deployment URLs
output "deployment_urls" {
  description = "All available deployment URLs"
  value = {
    s3_website_endpoint = aws_s3_bucket_website_configuration.website.website_endpoint
    cloudfront_url      = var.enable_cloudfront ? aws_cloudfront_distribution.website[0].domain_name : null
    custom_domain       = var.domain_name != "" ? var.domain_name : null
  }
}

# Primary URL (prefer CloudFront, fallback to S3)
output "primary_url" {
  description = "Primary deployment URL (CloudFront preferred)"
  value = var.enable_cloudfront 
    ? aws_cloudfront_distribution.website[0].domain_name 
    : aws_s3_bucket_website_configuration.website.website_endpoint
}

# Resource Information
output "resources" {
  description = "All created AWS resources"
  value = {
    s3_bucket = {
      name = aws_s3_bucket.website.id
      arn  = aws_s3_bucket.website.arn
      region = aws_s3_bucket.website.region
    }
    cloudfront = var.enable_cloudfront ? {
      id     = aws_cloudfront_distribution.website[0].id
      arn    = aws_cloudfront_distribution.website[0].arn
      domain = aws_cloudfront_distribution.website[0].domain_name
    } : null
    ssl_certificate = var.domain_name != "" && var.enable_ssl ? {
      arn = aws_acm_certificate.website[0].arn
      domain = aws_acm_certificate.website[0].domain_name
    } : null
    route53 = var.domain_name != "" ? {
      zone_id = data.aws_route53_zone.selected[0].zone_id
      domain  = var.domain_name
    } : null
    monitoring = {
      dashboard_name = aws_cloudwatch_dashboard.main.dashboard_name
      dashboard_arn  = aws_cloudwatch_dashboard.main.dashboard_arn
      app_logs       = aws_cloudwatch_log_group.application.name
      access_logs    = aws_cloudwatch_log_group.access.name
    }
  }
}

# Cost Estimation
output "estimated_monthly_cost" {
  description = "Estimated monthly cost for this deployment"
  value = {
    s3_storage = "~$0.023 per GB"
    cloudfront = "~$0.085 per GB transferred"
    ssl_certificate = "Free (AWS ACM)"
    route53 = "~$0.50 per hosted zone + $0.40 per million queries"
    cloudwatch = "~$0.50 per metric + $0.03 per GB of logs"
    total_estimate = "Typically $1-5/month for small projects"
  }
}

# Cleanup Instructions
output "cleanup_instructions" {
  description = "Instructions for cleaning up resources"
  value = {
    terraform_destroy = "Run 'terraform destroy' to remove all resources"
    manual_cleanup = "Or manually delete resources in AWS Console"
    important_note = "This will permanently delete all project data"
  }
}

# Next Steps
output "next_steps" {
  description = "Recommended next steps after deployment"
  value = [
    "Upload your application files to the S3 bucket",
    "Configure your domain DNS if using custom domain",
    "Set up monitoring alerts in CloudWatch",
    "Configure CI/CD pipeline for automatic deployments",
    "Set up backup and disaster recovery procedures"
  ]
}
