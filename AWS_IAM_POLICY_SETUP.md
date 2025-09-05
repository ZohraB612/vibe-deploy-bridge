# DeployHub AWS IAM Policy Setup

## Overview

This document explains how to set up the proper AWS IAM policy for DeployHub to work with your AWS account. The policy grants DeployHub the necessary permissions to manage your AWS resources for deployments.

## Policy Files

- `ENHANCED_DEPLOYHUB_POLICY.json` - Complete policy with all permissions
- Your original policy - Basic policy with core permissions

## Key Features Supported

### ✅ **Current Implementation Support:**
- **S3 Static Website Hosting** - Create buckets, configure website hosting, set CORS
- **CloudFront CDN** - Create distributions, manage cache behaviors, invalidations
- **CloudFormation Stacks** - Deploy infrastructure as code
- **Route53 DNS** - Manage domain records and hosted zones
- **SSL Certificates** - Request and manage ACM certificates
- **IAM Role Management** - Create and manage service roles
- **Monitoring & Logging** - CloudWatch metrics and logs

### 🚀 **Future Features Support:**
- **Lambda Functions** - Serverless function deployment
- **API Gateway** - REST API management
- **EC2 Resources** - Basic EC2 information gathering
- **Advanced Monitoring** - Alarms and detailed metrics

## Setup Instructions

### 1. Create IAM Role

1. Go to AWS IAM Console
2. Click "Roles" → "Create role"
3. Select "Another AWS account"
4. Enter your AWS Account ID
5. Check "Require external ID" (optional but recommended)
6. Click "Next"

### 2. Attach Policy

1. Search for "DeployHub" in the policy search
2. If you created a custom policy, select it
3. Otherwise, create a new policy using the JSON from `ENHANCED_DEPLOYHUB_POLICY.json`

### 3. Configure Trust Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "deployhub-external-id-123"
        }
      }
    }
  ]
}
```

### 4. Get Role ARN

After creating the role, copy the Role ARN. It will look like:
```
arn:aws:iam::123456789012:role/DeployHubRole
```

## Security Best Practices

### 🔒 **Resource Restrictions**
- All S3 resources are limited to `deployhub-*` buckets
- CloudFormation stacks are limited to `deployhub-*` naming
- IAM roles are limited to `deployhub-*` naming
- Log groups are limited to `/aws/deployhub/*` path

### 🛡️ **Additional Security Measures**
1. **Use External ID** - Add an external ID to the trust policy
2. **Time-based Access** - Consider using temporary credentials
3. **Monitor Usage** - Enable CloudTrail to monitor API calls
4. **Regular Rotation** - Rotate access keys regularly

### 📊 **Monitoring & Auditing**
- Enable CloudTrail for API call logging
- Set up CloudWatch alarms for unusual activity
- Regular review of IAM access logs
- Monitor resource creation and deletion

## Troubleshooting

### Common Issues

1. **Access Denied Errors**
   - Check if the policy is attached to the role
   - Verify the resource ARNs match the policy
   - Ensure the trust policy allows your account

2. **Missing Permissions**
   - Compare your current policy with the enhanced version
   - Check if new AWS services require additional permissions

3. **CORS Issues**
   - Ensure S3 bucket CORS configuration is correct
   - Check CloudFront distribution settings

### Debug Steps

1. **Test with AWS CLI:**
   ```bash
   aws sts assume-role --role-arn "arn:aws:iam::ACCOUNT:role/DeployHubRole" --role-session-name "test"
   ```

2. **Check CloudTrail:**
   - Look for denied API calls
   - Identify missing permissions

3. **Use AWS Policy Simulator:**
   - Test specific actions against your policy
   - Verify permissions before deployment

## Policy Comparison

| Feature | Original Policy | Enhanced Policy |
|---------|----------------|-----------------|
| S3 Basic Operations | ✅ | ✅ |
| S3 CORS Management | ❌ | ✅ |
| S3 Website Config | ✅ | ✅ |
| CloudFront Management | ✅ | ✅ |
| CloudFormation | ✅ | ✅ |
| Route53 | ✅ | ✅ |
| ACM Certificates | ✅ | ✅ |
| IAM Role Management | Basic | Advanced |
| Lambda Support | ❌ | ✅ |
| API Gateway | ❌ | ✅ |
| Advanced Monitoring | Basic | Advanced |

## Next Steps

1. **Update Your Policy** - Use the enhanced policy for full feature support
2. **Test Deployment** - Try deploying a project to verify permissions
3. **Monitor Usage** - Set up CloudWatch alarms for resource usage
4. **Regular Reviews** - Schedule monthly policy reviews

## Support

If you encounter issues with the IAM policy setup:
1. Check the AWS IAM documentation
2. Review the CloudTrail logs for denied actions
3. Use the AWS Policy Simulator to test permissions
4. Contact support with specific error messages

---

**Note:** This policy is designed for DeployHub's current and planned features. As new features are added, the policy may need updates to include additional permissions.
