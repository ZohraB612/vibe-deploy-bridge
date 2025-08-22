# DeployHub Backend Deployment Guide

This guide shows how to deploy the secure backend that handles AWS role assumption.

## Architecture Overview

```
User's AWS Account → IAM Role → DeployHub Backend (Lambda) → Real AWS Operations
```

## Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   aws configure
   ```

2. **Node.js and npm installed**

3. **AWS account with permissions to create:**
   - Lambda functions
   - IAM roles
   - API Gateway

## Deployment Steps

### 1. Navigate to Backend Directory
```bash
cd src/backend
```

### 2. Run Deployment Script
```bash
./deploy.sh
```

This script will:
- ✅ Create IAM role for Lambda with `sts:AssumeRole` permission
- ✅ Deploy Lambda function for role assumption
- ✅ Set up API Gateway with CORS
- ✅ Configure proper permissions
- ✅ Return API endpoint URL

### 3. Update Frontend Configuration

After deployment, you'll see output like:
```
🎉 Deployment Complete!
📡 API Endpoint: https://abc123.execute-api.us-east-1.amazonaws.com/prod/assume-role
```

Add this to your `.env` file:
```env
VITE_DEPLOYHUB_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com/prod
```

## What Gets Created

### AWS Lambda Function
- **Name**: `deployhub-assume-role`
- **Runtime**: Node.js 18.x
- **Handler**: `assume-role.handler`
- **Timeout**: 30 seconds
- **Memory**: 256 MB

### IAM Role for Lambda
- **Name**: `DeployHubLambdaRole`
- **Permissions**:
  - CloudWatch Logs (for logging)
  - `sts:AssumeRole` for user roles

### API Gateway
- **Name**: `deployhub-api`
- **Stage**: `prod`
- **Endpoint**: `/assume-role`
- **Methods**: POST, OPTIONS (CORS)

## Security Features

✅ **No AWS credentials in frontend code**  
✅ **Lambda uses IAM role (no hardcoded keys)**  
✅ **CORS properly configured**  
✅ **Input validation on all parameters**  
✅ **Proper error handling**  

## Testing the Backend

Test with curl:
```bash
curl -X POST https://your-api-url/assume-role \
  -H "Content-Type: application/json" \
  -d '{
    "roleArn": "arn:aws:iam::123456789012:role/DeployHubRole",
    "externalId": "deployhub-external-id",
    "userId": "test-user-123"
  }'
```

Expected response:
```json
{
  "success": true,
  "credentials": {
    "accessKeyId": "ASIA...",
    "secretAccessKey": "...",
    "sessionToken": "...",
    "expiration": "2024-01-01T12:00:00.000Z"
  }
}
```

## Updating the Backend

To update the Lambda function:
```bash
cd src/backend
npm run build
npm run deploy
```

## Monitoring

### CloudWatch Logs
- Function logs: `/aws/lambda/deployhub-assume-role`
- API Gateway logs: Available in API Gateway console

### API Gateway Metrics
- Request count
- Error rate
- Latency

## Troubleshooting

### Common Issues

**1. "Access Denied" when deploying**
- Check AWS CLI permissions
- Ensure you can create IAM roles and Lambda functions

**2. "Role assumption failed" in Lambda**
- Check user's IAM role trust policy
- Verify External ID matches
- Check role ARN format

**3. CORS errors in browser**
- Verify API Gateway has OPTIONS method
- Check CORS headers in Lambda response

**4. Lambda timeout**
- Increase timeout in Lambda configuration
- Check AWS API performance in the region

### Debug Commands

```bash
# Check Lambda function status
aws lambda get-function --function-name deployhub-assume-role

# View recent logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/deployhub"

# Test invoke Lambda directly
aws lambda invoke --function-name deployhub-assume-role \
  --payload '{"httpMethod":"POST","body":"{\"roleArn\":\"...\",\"externalId\":\"...\",\"userId\":\"test\"}"}' \
  response.json
```

## Cost Estimation

For typical usage:
- **Lambda**: ~$0.01/month (first 1M requests free)
- **API Gateway**: ~$3.50/month per million requests
- **CloudWatch Logs**: ~$0.50/month for basic logging

Total: **< $5/month** for most use cases

## Security Best Practices

1. **Rotate External IDs** periodically
2. **Monitor CloudTrail** for role assumptions
3. **Set up CloudWatch alarms** for failed requests
4. **Review IAM policies** regularly
5. **Use AWS Config** to monitor role changes

## Production Considerations

### High Availability
- Deploy Lambda in multiple regions
- Use Route 53 for failover
- Set up health checks

### Performance
- Use Lambda provisioned concurrency for consistent performance
- Enable API Gateway caching
- Monitor cold start metrics

### Security
- Enable AWS WAF on API Gateway
- Set up VPC endpoints if needed
- Use AWS Secrets Manager for sensitive configs
