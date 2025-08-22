#!/bin/bash

# DeployHub Backend Deployment Script
echo "🚀 Deploying DeployHub Backend to AWS Lambda..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Not authenticated with AWS. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Create deployment packages
echo "📦 Creating deployment packages..."
cp dist/assume-role.js .
cp dist/connect-aws-account.js .

# Package assume-role function
zip -r deployhub-assume-role.zip assume-role.js node_modules/

# Package connect-aws-account function  
zip -r deployhub-connect-aws.zip connect-aws-account.js node_modules/

# Get current AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "🔍 Using AWS Account: $ACCOUNT_ID"

# Create IAM role for Lambda (if it doesn't exist)
echo "🔐 Creating/updating IAM role..."

# Trust policy for Lambda
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Permission policy for assuming user roles (scalable - no specific ARNs)
cat > role-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "deployhub-trusted-service"
        }
      }
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
  --role-name DeployHubLambdaRole \
  --assume-role-policy-document file://trust-policy.json \
  --description "Role for DeployHub Lambda to assume user roles" \
  2>/dev/null || echo "ℹ️ Role already exists"

# Attach policy
aws iam put-role-policy \
  --role-name DeployHubLambdaRole \
  --policy-name DeployHubAssumeRolePolicy \
  --policy-document file://role-policy.json

echo "✅ IAM role configured"

# Wait for role propagation
sleep 10

# Create or update Lambda function
ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/DeployHubLambdaRole"

# Deploy assume-role function
if aws lambda get-function --function-name deployhub-assume-role &> /dev/null; then
    echo "🔄 Updating assume-role Lambda function..."
    aws lambda update-function-code \
      --function-name deployhub-assume-role \
      --zip-file fileb://deployhub-assume-role.zip
else
    echo "🆕 Creating assume-role Lambda function..."
    aws lambda create-function \
      --function-name deployhub-assume-role \
      --runtime nodejs18.x \
      --role $ROLE_ARN \
      --handler assume-role.handler \
      --zip-file fileb://deployhub-assume-role.zip \
      --timeout 30 \
      --memory-size 256 \
      --description "DeployHub role assumption service"
fi

# Deploy connect-aws-account function
if aws lambda get-function --function-name deployhub-connect-aws &> /dev/null; then
    echo "🔄 Updating connect-aws Lambda function..."
    aws lambda update-function-code \
      --function-name deployhub-connect-aws \
      --zip-file fileb://deployhub-connect-aws.zip
else
    echo "🆕 Creating connect-aws Lambda function..."
    aws lambda create-function \
      --function-name deployhub-connect-aws \
      --runtime nodejs18.x \
      --role $ROLE_ARN \
      --handler connect-aws-account.handler \
      --zip-file fileb://deployhub-connect-aws.zip \
      --timeout 30 \
      --memory-size 256 \
      --description "DeployHub AWS account connection verification"
fi

# Create API Gateway (if needed)
echo "🌐 Setting up API Gateway..."

# Check if API exists
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='deployhub-api'].id" --output text)

if [ "$API_ID" = "None" ] || [ -z "$API_ID" ]; then
    echo "🆕 Creating API Gateway..."
    API_ID=$(aws apigateway create-rest-api \
      --name deployhub-api \
      --description "DeployHub API" \
      --query id --output text)
fi

echo "✅ API Gateway ID: $API_ID"

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query "items[?path=='/'].id" --output text)

# Create assume-role resource
ASSUME_ROLE_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part assume-role \
  --query id --output text 2>/dev/null || \
  aws apigateway get-resources --rest-api-id $API_ID --query "items[?pathPart=='assume-role'].id" --output text)

# Create connect-aws-account resource
CONNECT_AWS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part connect-aws-account \
  --query id --output text 2>/dev/null || \
  aws apigateway get-resources --rest-api-id $API_ID --query "items[?pathPart=='connect-aws-account'].id" --output text)

# Set up assume-role endpoint
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $ASSUME_ROLE_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE \
  2>/dev/null || echo "ℹ️ assume-role POST method already exists"

aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $ASSUME_ROLE_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  2>/dev/null || echo "ℹ️ assume-role OPTIONS method already exists"

# Set up connect-aws-account endpoint
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $CONNECT_AWS_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE \
  2>/dev/null || echo "ℹ️ connect-aws POST method already exists"

aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $CONNECT_AWS_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  2>/dev/null || echo "ℹ️ connect-aws OPTIONS method already exists"

# Set up Lambda integrations
ASSUME_ROLE_LAMBDA_ARN="arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:deployhub-assume-role"
CONNECT_AWS_LAMBDA_ARN="arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:deployhub-connect-aws"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $ASSUME_ROLE_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$ASSUME_ROLE_LAMBDA_ARN/invocations" \
  2>/dev/null || echo "ℹ️ assume-role integration already exists"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $CONNECT_AWS_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$CONNECT_AWS_LAMBDA_ARN/invocations" \
  2>/dev/null || echo "ℹ️ connect-aws integration already exists"

# Set up CORS for both endpoints
echo "🔧 Setting up CORS configuration..."

# CORS for assume-role endpoint
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $ASSUME_ROLE_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
  2>/dev/null || echo "ℹ️ assume-role OPTIONS integration already exists"

aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $ASSUME_ROLE_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":true,"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true}' \
  2>/dev/null || echo "ℹ️ assume-role OPTIONS method response already exists"

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $ASSUME_ROLE_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'","method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'"}' \
  2>/dev/null || echo "ℹ️ assume-role OPTIONS integration response already exists"

# CORS for connect-aws-account endpoint
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $CONNECT_AWS_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json":"{\"statusCode\": 200}"}' \
  2>/dev/null || echo "ℹ️ connect-aws OPTIONS integration already exists"

aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $CONNECT_AWS_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":true,"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true}' \
  2>/dev/null || echo "ℹ️ connect-aws OPTIONS method response already exists"

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $CONNECT_AWS_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'","method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'"}' \
  2>/dev/null || echo "ℹ️ connect-aws OPTIONS integration response already exists"

# Grant API Gateway permissions to invoke Lambda functions
aws lambda add-permission \
  --function-name deployhub-assume-role \
  --statement-id apigateway-invoke-assume-role \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$ACCOUNT_ID:$API_ID/*/*" \
  2>/dev/null || echo "ℹ️ assume-role permission already granted"

aws lambda add-permission \
  --function-name deployhub-connect-aws \
  --statement-id apigateway-invoke-connect-aws \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$ACCOUNT_ID:$API_ID/*/*" \
  2>/dev/null || echo "ℹ️ connect-aws permission already granted"

# Deploy API
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod

# Get API endpoint
API_ENDPOINT="https://$API_ID.execute-api.us-east-1.amazonaws.com/prod"

echo ""
echo "🎉 Deployment Complete!"
echo "📡 API Endpoints:"
echo "   • Role Assumption: $API_ENDPOINT/assume-role"
echo "   • AWS Connection: $API_ENDPOINT/connect-aws-account"
echo ""
echo "🔑 DeployHub Account ID: $ACCOUNT_ID"
echo "📋 Users should use this in their IAM role trust policy"
echo ""
echo "Next steps:"
echo "1. Update your frontend .env file:"
echo "   VITE_DEPLOYHUB_API_URL=$API_ENDPOINT"
echo ""
echo "2. Update user instructions with DeployHub account ID: $ACCOUNT_ID"
echo ""
echo "3. Test the connection endpoint:"
echo "   curl -X POST $API_ENDPOINT/connect-aws-account \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"roleArn\":\"arn:aws:iam::USER_ACCOUNT:role/DeployHubRole\",\"externalId\":\"deployhub-trusted-service\",\"userId\":\"test\",\"accountId\":\"USER_ACCOUNT\"}'"
echo ""
echo "4. Test the assume role endpoint:"
echo "   curl -X POST $API_ENDPOINT/assume-role \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"roleArn\":\"arn:aws:iam::USER_ACCOUNT:role/DeployHubRole\",\"externalId\":\"deployhub-trusted-service\",\"userId\":\"test\"}'"

# Cleanup
rm -f trust-policy.json role-policy.json deployhub-assume-role.zip deployhub-connect-aws.zip assume-role.js connect-aws-account.js
