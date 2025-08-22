# Real AWS Deployment Setup

This guide shows how to set up **real AWS deployment** (no simulation) for DeployHub.

## Architecture

```
User's AWS Account → IAM Role → DeployHub assumes role → Real AWS Resources
```

## Setup Steps

### 1. DeployHub AWS Account Setup

DeployHub needs its own AWS account/credentials to assume user roles.

**Option A: Create AWS User for DeployHub**
1. Go to AWS IAM Console
2. Create user: `deployhub-service`
3. Attach policy with minimal permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::*:role/DeployHubRole"
    }
  ]
}
```
4. Create access keys
5. Add to `.env`:
```env
VITE_AWS_ACCESS_KEY_ID=AKIAXXXXXXXXX
VITE_AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxx
```

**Option B: Use Your Own AWS Account**
If you want to use your personal AWS account as the "DeployHub service":
1. Get your AWS access keys from AWS Console
2. Add to `.env` as above

### 2. User Setup (Same as Before)

Users follow the existing AWS setup flow:
1. Create IAM role in their account
2. Attach DeployHub policy
3. Provide Role ARN to DeployHub
4. DeployHub assumes their role using the credentials from step 1

### 3. Environment Variables

Copy `.env.example` to `.env` and set:

```env
# Required for real AWS deployment
VITE_AWS_ACCESS_KEY_ID=your_deployhub_aws_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_deployhub_aws_secret_key
VITE_AWS_REGION=us-east-1

# Your Supabase config
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## How It Works

1. **User creates role** with trust policy allowing DeployHub to assume it
2. **User provides ARN** through the setup flow
3. **DeployHub assumes role** using STS with its service credentials
4. **Real deployment happens** using the assumed role credentials

## Security

- ✅ DeployHub only has permission to assume specific roles
- ✅ Users control what DeployHub can do via their IAM policies  
- ✅ No simulation or fake data
- ✅ All AWS operations are real and auditable

## Testing

1. Set up environment variables
2. User completes AWS setup with real role
3. Upload project and deploy
4. Check AWS console for real resources:
   - S3 bucket created
   - CloudFront distribution
   - Files uploaded

## Error Handling

If role assumption fails, you'll see real AWS error messages:
- "Access Denied" - check role trust policy
- "Invalid ARN" - check ARN format
- "External ID mismatch" - check external ID

No fallback to simulation - only real AWS operations!
