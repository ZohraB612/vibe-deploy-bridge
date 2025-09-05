import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

// AWS Lambda handler for role assumption
export async function assumeRole(event: { httpMethod: string; body?: string }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
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
    const { roleArn, externalId, userId } = JSON.parse(event.body || '{}');

    // Validate required parameters
    if (!roleArn || !externalId || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters: roleArn, externalId, userId' 
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

    // Create STS client using the Lambda's IAM role (no explicit credentials needed)
    // The Lambda execution role will have permission to assume user roles
    const stsClient = new STSClient({ 
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Assume the user's role
    const assumeRoleResult = await stsClient.send(new AssumeRoleCommand({
      RoleArn: roleArn,
      ExternalId: externalId,
      RoleSessionName: `deployhub-${Date.now()}`,
      DurationSeconds: 3600, // 1 hour
    }));

    if (!assumeRoleResult.Credentials) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to assume role - no credentials returned' 
        })
      };
    }

    // Return the temporary credentials
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        credentials: {
          accessKeyId: assumeRoleResult.Credentials.AccessKeyId,
          secretAccessKey: assumeRoleResult.Credentials.SecretAccessKey,
          sessionToken: assumeRoleResult.Credentials.SessionToken,
          expiration: assumeRoleResult.Credentials.Expiration,
        },
      })
    };

  } catch (error: unknown) {
    console.error('Role assumption failed:', error);
    
    // Return specific error messages for common issues
    let errorMessage = 'Failed to assume AWS role';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.name === 'AccessDenied') {
        errorMessage = 'Access denied. Please check your Role ARN and External ID.';
        statusCode = 403;
      } else if (error.name === 'InvalidParameterValue') {
        errorMessage = 'Invalid parameters provided.';
        statusCode = 400;
      } else if (error.name === 'MalformedPolicyDocument') {
        errorMessage = 'Invalid role trust policy. Please check your IAM role configuration.';
        statusCode = 400;
      }
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
