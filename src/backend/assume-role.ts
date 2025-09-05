import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';

export const handler = async (event: any, context: any) => {
  try {
    const { roleArn, sessionName = 'DeployHubSession' } = JSON.parse(event.body || '{}');
    
    if (!roleArn) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify({ error: 'Missing roleArn' })
      };
    }

    const stsClient = new STSClient({});
    
    const command = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: sessionName,
      DurationSeconds: 3600 // 1 hour
    });
    
    const result = await stsClient.send(command);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        success: true,
        credentials: {
          accessKeyId: result.Credentials?.AccessKeyId,
          secretAccessKey: result.Credentials?.SecretAccessKey,
          sessionToken: result.Credentials?.SessionToken,
          expiration: result.Credentials?.Expiration
        }
      })
    };
    
  } catch (error: any) {
    console.error('Assume role error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({ 
        error: error.message,
        success: false 
      })
    };
  }
};
