# CloudWatch Log Group for Application Logs
resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/deployhub/${var.project_name}/application"
  retention_in_days = 30
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-logs"
    Type = "Application Logs"
  })
}

# CloudWatch Log Group for Access Logs
resource "aws_cloudwatch_log_group" "access" {
  name              = "/aws/deployhub/${var.project_name}/access"
  retention_in_days = 30
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-access-logs"
    Type = "Access Logs"
  })
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.name_prefix}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.website[0].id],
            [".", "BytesDownloaded", ".", "."],
            [".", "BytesUploaded", ".", "."]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "CloudFront Metrics - ${var.project_name}"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/S3", "NumberOfObjects", "BucketName", aws_s3_bucket.website.id],
            [".", "BucketSizeBytes", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "S3 Metrics - ${var.project_name}"
        }
      }
    ]
  })
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  count = var.enable_cloudfront ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4xxError"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "High 4xx error rate for ${var.project_name}"
  
  dimensions = {
    DistributionId = aws_cloudfront_distribution.website[0].id
    Region         = "Global"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-error-alarm"
    Type = "Error Rate Alarm"
  })
}

resource "aws_cloudwatch_metric_alarm" "high_latency" {
  count = var.enable_cloudfront ? 1 : 0
  
  alarm_name          = "${local.name_prefix}-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TotalErrorRate"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "High error rate for ${var.project_name}"
  
  dimensions = {
    DistributionId = aws_cloudfront_distribution.website[0].id
    Region         = "Global"
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-latency-alarm"
    Type = "Latency Alarm"
  })
}

# Outputs
output "cloudwatch_dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "cloudwatch_dashboard_arn" {
  description = "CloudWatch dashboard ARN"
  value       = aws_cloudwatch_dashboard.main.dashboard_arn
}

output "application_log_group" {
  description = "Application log group name"
  value       = aws_cloudwatch_log_group.application.name
}

output "access_log_group" {
  description = "Access log group name"
  value       = aws_cloudwatch_log_group.access.name
}
