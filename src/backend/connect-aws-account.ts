import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

// AWS Lambda handler for AWS account connection verification
export const handler = async (event: any) => {
  // CORS headers for web requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight CORS requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { roleArn, externalId, userId, accountId } = JSON.parse(event.body || '{}');

    // Validate required parameters
    if (!roleArn || !externalId || !userId || !accountId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters: roleArn, externalId, userId, accountId' 
        })
      };
    }

    // Validate ARN format
    const arnRegex = /^arn:aws:iam::(\d{12}):role\/[\w+=,.@-]+$/;
    if (!arnRegex.test(roleArn)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid Role ARN format' 
        })
      };
    }

    // Extract account ID from ARN and verify it matches provided account ID
    const arnAccountId = roleArn.split(':')[4];
    if (arnAccountId !== accountId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Account ID in ARN does not match provided account ID' 
        })
      };
    }

    // Create STS client using the Lambda's IAM role
    const stsClient = new STSClient({ 
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Step 1: Verify that we can assume the role (test the trust relationship)
    try {
      const testAssumeResult = await stsClient.send(new AssumeRoleCommand({
        RoleArn: roleArn,
        ExternalId: externalId,
        RoleSessionName: `deployhub-verification-${Date.now()}`,
        DurationSeconds: 900, // 15 minutes - minimal duration for verification
      }));

      if (!testAssumeResult.Credentials) {
        throw new Error("Role assumption test failed - no credentials returned");
      }

      // Step 2: Use the assumed role to verify account access
      const assumedStsClient = new STSClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: testAssumeResult.Credentials.AccessKeyId!,
          secretAccessKey: testAssumeResult.Credentials.SecretAccessKey!,
          sessionToken: testAssumeResult.Credentials.SessionToken!,
        }
      });

      const callerIdentity = await assumedStsClient.send(new GetCallerIdentityCommand({}));
      
      // Verify the assumed role belongs to the correct account
      if (callerIdentity.Account !== accountId) {
        throw new Error("Account verification failed");
      }

      // Step 3: Store the verified connection in Supabase
      // Note: In a real implementation, you'd use Supabase client here
      // For now, we'll return success with the verified information
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'AWS account connection verified successfully',
          verification: {
            accountId: callerIdentity.Account,
            roleArn: roleArn,
            assumedRoleArn: callerIdentity.Arn,
            verifiedAt: new Date().toISOString()
          }
        })
      };

    } catch (assumeError: any) {
      console.error('Role assumption verification failed:', assumeError);
      
      // Provide helpful error messages based on the type of failure
      let errorMessage = 'Failed to verify AWS role connection';
      let statusCode = 400;

      if (assumeError.name === 'AccessDenied') {
        errorMessage = 'Access denied. Please check that your IAM role trust policy allows DeployHub to assume it.';
        statusCode = 403;
      } else if (assumeError.name === 'InvalidParameterValue') {
        errorMessage = 'Invalid role ARN or external ID provided.';
        statusCode = 400;
      } else if (assumeError.message.includes('ExternalId')) {
        errorMessage = 'External ID mismatch. Please check your role configuration.';
        statusCode = 400;
      } else if (assumeError.message.includes('does not exist')) {
        errorMessage = 'The specified IAM role does not exist.';
        statusCode = 404;
      }

      return {
        statusCode,
        headers,
        body: JSON.stringify({
          error: errorMessage,
          details: assumeError.message,
          suggestion: 'Please verify your IAM role trust policy includes DeployHub as a trusted entity.'
        })
      };
    }

  } catch (error: any) {
    console.error('AWS account connection failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error during AWS account verification',
        details: error.message
      })
    };
  }
};
