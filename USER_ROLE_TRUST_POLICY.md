# User IAM Role Trust Policy - Updated Architecture

## What Changed

DeployHub now uses a **scalable trust-based architecture** where:
- ✅ Users control access by setting up trust relationships
- ✅ No manual policy updates needed on DeployHub's side
- ✅ Secure and scalable for unlimited users

## Updated Trust Policy for User's Role

When creating your IAM role, use this **trust policy**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::DEPLOYHUB_ACCOUNT_ID:role/DeployHubLambdaRole"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "deployhub-trusted-service"
        }
      }
    }
  ]
}
```

## How to Set This Up

### Step 1: Get DeployHub's Account ID
The deployment script will provide DeployHub's AWS account ID. Replace `DEPLOYHUB_ACCOUNT_ID` with the actual account ID.

### Step 2: Create Your Role with Trust Policy
1. Go to AWS IAM Console → Roles
2. Click "Create role"
3. Select "Custom trust policy"
4. Paste the trust policy above (with correct account ID)
5. Attach the DeployHub permissions policy
6. Name your role (e.g., "DeployHubRole")

### Step 3: Test the Connection
DeployHub will automatically verify the trust relationship when you provide your role ARN.

## Security Benefits

✅ **You control access** - Only you can grant/revoke DeployHub's access  
✅ **No shared secrets** - Uses AWS's native trust mechanism  
✅ **Auditable** - All actions logged in CloudTrail  
✅ **Revocable** - Delete the role to immediately revoke access  
✅ **Scoped permissions** - Role permissions limit what DeployHub can do  

## Trust Relationship Verification

When you connect your AWS account, DeployHub will:

1. **Test assume role** - Verify the trust relationship works
2. **Verify account** - Ensure the role belongs to your account  
3. **Store connection** - Save the verified ARN for deployments
4. **Provide feedback** - Show success/error messages with guidance

## Common Trust Policy Issues

### "Access Denied" Error
- Check the DeployHub account ID is correct
- Verify the role name matches exactly
- Ensure external ID is "deployhub-trusted-service"

### "Role does not exist" Error  
- Double-check the role ARN
- Ensure the role is in the correct AWS account
- Verify you have permission to view the role

### "ExternalId mismatch" Error
- Confirm external ID is exactly: `deployhub-trusted-service`
- Check for extra spaces or characters

## Example Role Creation (AWS CLI)

```bash
# Create trust policy file
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::DEPLOYHUB_ACCOUNT_ID:role/DeployHubLambdaRole"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "deployhub-trusted-service"
        }
      }
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name DeployHubRole \
  --assume-role-policy-document file://trust-policy.json

# Attach the permissions policy
aws iam attach-role-policy \
  --role-name DeployHubRole \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT:policy/DeployHubPolicy
```

## Revoking Access

To revoke DeployHub's access at any time:

```bash
# Option 1: Delete the role entirely
aws iam delete-role --role-name DeployHubRole

# Option 2: Remove the trust relationship
aws iam update-assume-role-policy \
  --role-name DeployHubRole \
  --policy-document '{"Version":"2012-10-17","Statement":[]}'
```

This new architecture gives you complete control over DeployHub's access to your AWS account!
