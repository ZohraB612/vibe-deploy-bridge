import {
  S3Client,
  CreateBucketCommand,
  PutBucketWebsiteCommand,
  PutBucketPolicyCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  PutPublicAccessBlockCommand
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateDistributionCommand,
  CreateInvalidationCommand,
  GetDistributionCommand
} from "@aws-sdk/client-cloudfront";
import * as unzipper from 'unzipper';
import { Readable } from 'stream';

// AWS Lambda handler for S3 deployment
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
    const { 
      projectName, 
      files, 
      domain, 
      credentials, 
      region = 'us-east-1' 
    } = JSON.parse(event.body || '{}');

    // Validate required parameters
    if (!projectName || !files || !credentials) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters: projectName, files, credentials' 
        })
      };
    }

    // Create S3 client using provided credentials
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

    // Generate unique bucket name
    const timestamp = Date.now();
    const bucketName = `deployhub-${projectName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;

    console.log(`Creating S3 bucket: ${bucketName}`);

            // Create S3 bucket
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log("S3 bucket created successfully");
        
        // Wait for bucket to be available
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Disable block public access settings to allow public read policies
        console.log("Disabling block public access settings...");
        await s3Client.send(new PutPublicAccessBlockCommand({
          Bucket: bucketName,
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            IgnorePublicAcls: false,
            BlockPublicPolicy: false,
            RestrictPublicBuckets: false
          }
        }));
        console.log("Block public access settings disabled");

    // Configure CORS
    const corsConfiguration = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                          AllowedOrigins: [
                  'http://localhost:8081', 
                  'http://localhost:8082', 
                  'http://localhost:8083',
                  'http://localhost:3000',
                  'http://localhost:3001',
                  'http://localhost:5173',
                  'http://localhost:4173',
                  'http://localhost:8080'
                ],
          ExposeHeaders: ['ETag', 'x-amz-meta-custom-header'],
          MaxAgeSeconds: 3000
        }
      ]
    };

    await s3Client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfiguration
    }));
    console.log("CORS policy configured successfully");

    // Wait for CORS to propagate
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Configure static website hosting
    await s3Client.send(new PutBucketWebsiteCommand({
      Bucket: bucketName,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: 'index.html' },
        ErrorDocument: { Key: 'index.html' },
      },
    }));
    console.log("Static website hosting configured successfully");

    // Set bucket policy for public read
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [{
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${bucketName}/*`
      }]
    };

    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy)
    }));
    console.log("Bucket policy set successfully");

            // Create CloudFront distribution
        const distributionResult = await cloudFrontClient.send(new CreateDistributionCommand({
          DistributionConfig: {
            CallerReference: `deployhub-${Date.now()}`,
            Comment: `DeployHub distribution for ${projectName}`,
            DefaultCacheBehavior: {
              TargetOriginId: `S3-${bucketName}`,
              ViewerProtocolPolicy: 'redirect-to-https',
              AllowedMethods: {
                Quantity: 2,
                Items: ['GET', 'HEAD'],
                CachedMethods: {
                  Quantity: 2,
                  Items: ['GET', 'HEAD'],
                },
              },
              Compress: true,
              DefaultTTL: 86400,
              MinTTL: 0,
              MaxTTL: 31536000,
              ForwardedValues: {
                QueryString: false,
                Cookies: {
                  Forward: 'none',
                },
                Headers: {
                  Quantity: 0,
                  Items: [],
                },
                QueryStringCacheKeys: {
                  Quantity: 0,
                  Items: [],
                },
              },
            },
            Enabled: true,
            Origins: {
              Quantity: 1,
              Items: [{
                Id: `S3-${bucketName}`,
                DomainName: `${bucketName}.s3-website-${region}.amazonaws.com`,
                CustomOriginConfig: {
                  HTTPPort: 80,
                  HTTPSPort: 443,
                  OriginProtocolPolicy: 'http-only',
                },
              }],
            },
            PriceClass: 'PriceClass_100',
          },
        }));

    const distributionId = distributionResult.Distribution?.Id;
    const websiteUrl = `https://${distributionResult.Distribution?.DomainName}`;

    if (!distributionId || !websiteUrl) {
      throw new Error("Failed to create CloudFront distribution");
    }

    console.log(`CloudFront distribution created: ${distributionId}`);

    // Wait a reasonable time for CloudFront to start propagating
    console.log("Waiting for CloudFront distribution to start propagating...");
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
    console.log("CloudFront distribution created, continuing with deployment...");

    // Upload files to S3
    console.log("Uploading project files to S3...");
    for (const file of files) {
      try {
        console.log(`Processing: ${file.name}`);
        
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(file.content, 'base64');
        
        if (file.name.toLowerCase().endsWith('.zip')) {
          // Handle ZIP file - extract and upload contents
          console.log(`Extracting ZIP file: ${file.name}`);
          const stream = Readable.from(fileBuffer);
          
          const entries = await unzipper.Open.buffer(fileBuffer);
          
          for (const entry of entries.files) {
            if (!entry.type || entry.type === 'File') {
              const content = await entry.buffer();
              const key = entry.path;
              
              // Skip hidden files and directories
              if (key.startsWith('__MACOSX/') || key.startsWith('.DS_Store') || key.includes('/.')) {
                continue;
              }
              
              console.log(`Uploading extracted file: ${key}`);
              
              await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: content,
                ContentType: getContentType(key),
              }));
              
              console.log(`Successfully uploaded: ${key}`);
            }
          }
        } else {
          // Handle regular file
          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: file.name,
            Body: fileBuffer,
            ContentType: getContentType(file.name),
          }));
          
          console.log(`Successfully uploaded: ${file.name}`);
        }
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Create CloudFront invalidation
    try {
      await cloudFrontClient.send(new CreateInvalidationCommand({
        DistributionId: distributionId,
        InvalidationBatch: {
          CallerReference: `${projectName}-${Date.now()}`,
          Paths: {
            Quantity: 1,
            Items: ['/*'],
          },
        },
      }));
      console.log("CloudFront invalidation created");
    } catch (error) {
      console.warn("CloudFront invalidation failed:", error);
      // Don't fail the entire deployment for invalidation issues
    }

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        bucketName,
        distributionId,
        websiteUrl,
        message: 'Deployment completed successfully'
      })
    };

  } catch (error: any) {
    console.error('S3 deployment failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred during deployment'
      })
    };
  }
};

// Helper function to determine content type
function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'html': return 'text/html';
    case 'css': return 'text/css';
    case 'js': return 'application/javascript';
    case 'json': return 'application/json';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'ico': return 'image/x-icon';
    case 'txt': return 'text/plain';
    case 'xml': return 'application/xml';
    case 'pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}
