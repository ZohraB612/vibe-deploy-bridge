import { S3Client, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { CloudFrontClient, DeleteDistributionCommand, ListDistributionsCommand } from "@aws-sdk/client-cloudfront";

export interface CleanupRequest {
  projectName: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
  region?: string;
}

export interface CleanupResult {
  success: boolean;
  message: string;
  projectName: string;
  bucketName?: string;
  distributionId?: string;
  errors?: string[];
}

export async function cleanupProject(event: { httpMethod: string; body?: string }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
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
    const { projectName, credentials, region = 'us-east-1' } = JSON.parse(event.body || '{}');

    // Validate required parameters
    if (!projectName || !credentials) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters: projectName, credentials' 
        })
      };
    }

    // Create S3 client
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    // Create CloudFront client
    const cloudFrontClient = new CloudFrontClient({
      region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    const errors: string[] = [];
    let bucketName: string | undefined;
    let distributionId: string | undefined;

    // Find and delete S3 bucket
    try {
      // List buckets to find the project bucket
      const bucketNamePattern = `deployhub-${projectName.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Try to find bucket by pattern
      const bucketName = `${bucketNamePattern}-${Date.now()}`;
      
      // Delete all objects in bucket first
      const listObjectsResult = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }));
      
      if (listObjectsResult.Contents && listObjectsResult.Contents.length > 0) {
        const deletePromises = listObjectsResult.Contents.map(obj => 
          s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.Key! }))
        );
        await Promise.all(deletePromises);
      }

      // Delete the bucket
      await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
      console.log(`S3 bucket ${bucketName} deleted successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown S3 error';
      errors.push(`S3 cleanup failed: ${errorMessage}`);
    }

    // Find and delete CloudFront distribution
    try {
      const listDistributionsResult = await cloudFrontClient.send(new ListDistributionsCommand({}));
      
      if (listDistributionsResult.DistributionList?.Items) {
        for (const distribution of listDistributionsResult.DistributionList.Items) {
          if (distribution.Comment?.includes(projectName) || distribution.DomainName?.includes(projectName)) {
            distributionId = distribution.Id;
            console.log(`Found CloudFront distribution ${distributionId} for project ${projectName}`);
            break;
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown CloudFront error';
      errors.push(`CloudFront cleanup failed: ${errorMessage}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: errors.length === 0,
        message: errors.length === 0 
          ? `Project cleanup completed for: ${projectName}`
          : `Project cleanup completed with errors for: ${projectName}`,
        projectName,
        bucketName,
        distributionId,
        errors: errors.length > 0 ? errors : undefined
      })
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during cleanup';
    const projectNameFromError = 'unknown'; // Fallback for error cases
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: `Project cleanup failed for: ${projectNameFromError}`,
        projectName: projectNameFromError,
        errors: [errorMessage]
      })
    };
  }
}
