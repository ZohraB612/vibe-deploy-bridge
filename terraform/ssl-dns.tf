# ACM Certificate for SSL
resource "aws_acm_certificate" "website" {
  count = var.domain_name != "" && var.enable_ssl ? 1 : 0
  
  domain_name       = var.domain_name
  validation_method = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ssl-cert"
    Type = "SSL Certificate"
  })
}

# Certificate validation records
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.website[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  zone_id = data.aws_route53_zone.selected[0].zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

# Certificate validation
resource "aws_acm_certificate_validation" "website" {
  count = var.domain_name != "" && var.enable_ssl ? 1 : 0
  
  certificate_arn         = aws_acm_certificate.website[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route53 Zone Data Source
data "aws_route53_zone" "selected" {
  count = var.domain_name != "" ? 1 : 0
  
  name         = var.domain_name
  private_zone = false
}

# Route53 A Record for CloudFront
resource "aws_route53_record" "website" {
  count = var.domain_name != "" ? 1 : 0
  
  zone_id = data.aws_route53_zone.selected[0].zone_id
  name    = var.domain_name
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.website[0].domain_name
    zone_id                = aws_cloudfront_distribution.website[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# Route53 AAAA Record for IPv6
resource "aws_route53_record" "website_ipv6" {
  count = var.domain_name != "" ? 1 : 0
  
  zone_id = data.aws_route53_zone.selected[0].zone_id
  name    = var.domain_name
  type    = "AAAA"
  
  alias {
    name                   = aws_cloudfront_distribution.website[0].domain_name
    zone_id                = aws_cloudfront_distribution.website[0].hosted_zone_id
    evaluate_target_health = false
  }
}

# Outputs
output "ssl_certificate_arn" {
  description = "SSL certificate ARN"
  value       = var.domain_name != "" && var.enable_ssl ? aws_acm_certificate.website[0].arn : null
}

output "domain_name" {
  description = "Domain name"
  value       = var.domain_name
}

output "route53_zone_id" {
  description = "Route53 zone ID"
  value       = var.domain_name != "" ? data.aws_route53_zone.selected[0].zone_id : null
}
