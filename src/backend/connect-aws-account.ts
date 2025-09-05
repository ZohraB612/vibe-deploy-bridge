import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

export const handler = async (event: any, context: any) => {
  try {
    const { credentials } = JSON.parse(event.body || '{}');
    
    if (!credentials) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify({ error: 'Missing credentials' })
      };
    }

    const stsClient = new STSClient({ credentials });
    
    const command = new GetCallerIdentityCommand({});
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
        accountId: result.Account,
        userId: result.UserId,
        arn: result.Arn
      })
    };
    
  } catch (error: any) {
    console.error('Connect AWS account error:', error);
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
