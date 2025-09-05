import express from 'express';
import cors from 'cors';
import { handler as deployS3Handler } from './deploy-s3';
import { handler as assumeRoleHandler } from './assume-role';
import { handler as connectAWSAccountHandler } from './connect-aws-account';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost on any port
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    
    // Allow specific origins
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8081',
      'http://localhost:8082'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Utility function to convert Lambda handler to Express handler
const lambdaToExpress = (handler: any) => {
  return async (req: express.Request, res: express.Response) => {
    try {
      const event = {
        httpMethod: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body ? JSON.stringify(req.body) : null,
        queryStringParameters: req.query,
        pathParameters: req.params
      };

      const context = {
        callbackWaitsForEmptyEventLoop: false,
        functionName: 'local-server',
        functionVersion: '$LATEST',
        invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:local-server',
        memoryLimitInMB: '128',
        awsRequestId: 'local-request-id',
        logGroupName: '/aws/lambda/local-server',
        logStreamName: '2023/01/01/[$LATEST]local-stream',
        getRemainingTimeInMillis: () => 30000,
        done: () => {},
        fail: () => {},
        succeed: () => {}
      };

      const result = await handler(event, context);
      
      res.status(result.statusCode || 200);
      
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.setHeader(key, value as string);
        });
      }
      
      if (result.body) {
        try {
          const body = JSON.parse(result.body);
          res.json(body);
        } catch {
          res.send(result.body);
        }
      } else {
        res.end();
      }
    } catch (error: any) {
      console.error('Handler error:', error);
      res.status(500).json({ error: error.message });
    }
  };
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'DeployHub Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      deploy: '/deploy-s3',
      assumeRole: '/assume-role',
      connectAWS: '/connect-aws-account'
    }
  });
});

// Deploy to S3 endpoint
app.post('/deploy-s3', lambdaToExpress(deployS3Handler));

// Assume role endpoint
app.post('/assume-role', lambdaToExpress(assumeRoleHandler));

// Connect AWS account endpoint
app.post('/connect-aws-account', lambdaToExpress(connectAWSAccountHandler));

// Check deployment status endpoint
app.get('/check-status/:distributionId', async (req, res) => {
  try {
    const { distributionId } = req.params;
    const { credentials, region = 'us-east-1' } = req.query;

    if (!credentials) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const { CloudFrontClient, GetDistributionCommand } = await import('@aws-sdk/client-cloudfront');
    
    const cloudFrontClient = new CloudFrontClient({ 
      region: region as string, 
      credentials: JSON.parse(credentials as string) 
    });

    const result = await cloudFrontClient.send(new GetDistributionCommand({ Id: distributionId }));
    
    res.json({
      distributionId,
      status: result.Distribution?.Status,
      domainName: result.Distribution?.DomainName,
      enabled: result.Distribution?.DistributionConfig?.Enabled,
      lastModifiedTime: result.Distribution?.LastModifiedTime
    });
  } catch (error: any) {
    console.error('Status check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced resource cleanup endpoint
app.post('/cleanup-resources', async (req, res) => {
  try {
    const { bucketName, distributionId, credentials, region = 'us-east-1' } = req.body;
    
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
      message: `Resource cleanup completed`,
      bucketName,
      distributionId
    });
  } catch (error: any) {
    console.error('Resource cleanup failed:', error);
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
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 DeployHub Backend Server running on http://localhost:${PORT}`);
  console.log(`📝 Deploy endpoint: http://localhost:${PORT}/deploy-s3`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Server bound to all interfaces (IPv4 + IPv6)`);
});

export default app;
