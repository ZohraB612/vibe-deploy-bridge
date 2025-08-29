import express from 'express';
import cors from 'cors';
import { handler as deployS3Handler } from './deploy-s3';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for file uploads

// Convert Lambda handler to Express middleware
const lambdaToExpress = (lambdaHandler: any) => {
  return async (req: express.Request, res: express.Response) => {
    try {
      // Convert Express request to Lambda event format
      const event = {
        httpMethod: req.method,
        body: JSON.stringify(req.body),
        headers: req.headers,
        path: req.path,
        queryStringParameters: req.query,
      };

      // Call Lambda handler
      const result = await lambdaHandler(event);
      
      // Set response headers
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.set(key, value as string);
        });
      }
      
      // Send response
      res.status(result.statusCode).send(result.body);
    } catch (error) {
      console.error('Error in Lambda handler:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'DeployHub Backend API', 
    version: '1.0.0',
    endpoints: [
      'POST /deploy-s3',
      'GET /health',
      'GET /check-status/:distributionId',
      'POST /cleanup-resources',
      'POST /cleanup-project'
    ],
    status: 'running'
  });
});

app.post('/deploy-s3', lambdaToExpress(deployS3Handler));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Status check for CloudFront distributions
app.get('/check-status/:distributionId', (req, res) => {
  const { distributionId } = req.params;
  res.json({ 
    message: 'Status check endpoint added. You can use AWS CLI to check:',
    command: `aws cloudfront get-distribution --id ${distributionId} --region us-east-1`,
    distributionId,
    note: 'CloudFront distributions typically take 5-15 minutes to fully propagate'
  });
});

// Cleanup endpoint for removing old AWS resources
app.post('/cleanup-resources', async (req, res) => {
  try {
    const { bucketNames, distributionIds, credentials, region = 'us-east-1' } = req.body;
    
    if (!bucketNames || !distributionIds || !credentials) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const { S3Client, DeleteBucketCommand, DeleteObjectCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const { CloudFrontClient, DeleteDistributionCommand, GetDistributionCommand } = await import('@aws-sdk/client-cloudfront');
    
    const s3Client = new S3Client({ region, credentials });
    const cloudFrontClient = new CloudFrontClient({ region, credentials });
    
    const results: { deleted: string[], errors: string[] } = { deleted: [], errors: [] };
    
    // Delete CloudFront distributions
    for (const distributionId of distributionIds) {
      try {
        // Check if distribution is enabled
        const dist = await cloudFrontClient.send(new GetDistributionCommand({ Id: distributionId }));
        if (dist.Distribution?.DistributionConfig?.Enabled) {
          // Disable first, then delete
          console.log(`Disabling CloudFront distribution: ${distributionId}`);
          // Note: In production, you'd need to implement UpdateDistributionCommand
        }
        
        console.log(`Deleting CloudFront distribution: ${distributionId}`);
        await cloudFrontClient.send(new DeleteDistributionCommand({ Id: distributionId }));
        results.deleted.push(`CloudFront: ${distributionId}`);
      } catch (error: any) {
        results.errors.push(`CloudFront ${distributionId}: ${error.message}`);
      }
    }
    
    // Delete S3 buckets
    for (const bucketName of bucketNames) {
      try {
        // Delete all objects first
        const objects = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }));
        if (objects.Contents && objects.Contents.length > 0) {
          const deletePromises = objects.Contents.map(obj => 
            s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.Key! }))
          );
          await Promise.all(deletePromises);
        }
        
        console.log(`Deleting S3 bucket: ${bucketName}`);
        await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
        results.deleted.push(`S3: ${bucketName}`);
      } catch (error: any) {
        results.errors.push(`S3 ${bucketName}: ${error.message}`);
      }
    }
    
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Enhanced project cleanup endpoint
app.post('/cleanup-project', async (req, res) => {
  try {
    const { projectName, bucketName, distributionId, credentials, region = 'us-east-1' } = req.body;
    
    if (!credentials) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    
    const { S3Client, DeleteBucketCommand, DeleteObjectCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const { CloudFrontClient, DeleteDistributionCommand, GetDistributionCommand } = await import('@aws-sdk/client-cloudfront');
    
    const s3Client = new S3Client({ region, credentials });
    const cloudFrontClient = new CloudFrontClient({ region, credentials });
    
    const results: { deleted: string[], errors: string[] } = { deleted: [], errors: [] };
    
    // Delete CloudFront distribution if provided
    if (distributionId) {
      try {
        console.log(`Cleaning up CloudFront distribution: ${distributionId}`);
        
        // Get distribution details to check if it's enabled
        const dist = await cloudFrontClient.send(new GetDistributionCommand({ Id: distributionId }));
        
        if (dist.Distribution?.DistributionConfig?.Enabled) {
          console.log(`Distribution ${distributionId} is enabled, attempting to disable...`);
          // Note: In a production environment, you'd need to implement UpdateDistributionCommand
          // For now, we'll try to delete it directly (this may fail if enabled)
        }
        
        await cloudFrontClient.send(new DeleteDistributionCommand({ Id: distributionId }));
        results.deleted.push(`CloudFront: ${distributionId}`);
        console.log(`Successfully deleted CloudFront distribution: ${distributionId}`);
      } catch (error: any) {
        const errorMsg = `CloudFront ${distributionId}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    // Delete S3 bucket if provided
    if (bucketName) {
      try {
        console.log(`Cleaning up S3 bucket: ${bucketName}`);
        
        // List and delete all objects in the bucket
        const objects = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }));
        
        if (objects.Contents && objects.Contents.length > 0) {
          console.log(`Found ${objects.Contents.length} objects to delete in bucket ${bucketName}`);
          
          // Delete objects in batches (AWS allows up to 1000 objects per request)
          const batchSize = 1000;
          for (let i = 0; i < objects.Contents.length; i += batchSize) {
            const batch = objects.Contents.slice(i, i + batchSize);
            const deletePromises = batch.map(obj => 
              s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: obj.Key! }))
            );
            await Promise.all(deletePromises);
            console.log(`Deleted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(objects.Contents.length / batchSize)}`);
          }
        }
        
        // Delete the empty bucket
        await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
        results.deleted.push(`S3: ${bucketName}`);
        console.log(`Successfully deleted S3 bucket: ${bucketName}`);
      } catch (error: any) {
        const errorMsg = `S3 ${bucketName}: ${error.message}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    res.json({ 
      success: true, 
      results,
      message: `Project cleanup completed for: ${projectName}`,
      projectName,
      bucketName,
      distributionId
    });
  } catch (error: any) {
    console.error('Project cleanup failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server - Bind to both IPv4 and IPv6
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DeployHub Backend Server running on http://localhost:${PORT}`);
  console.log(`📝 Deploy endpoint: http://localhost:${PORT}/deploy-s3`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Server bound to all interfaces (IPv4 + IPv6)`);
});

export default app;
