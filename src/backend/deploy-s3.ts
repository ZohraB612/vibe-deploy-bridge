import { S3Client, CreateBucketCommand, PutObjectCommand, PutBucketWebsiteCommand, PutBucketPolicyCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateDistributionCommand, GetDistributionCommand } from '@aws-sdk/client-cloudfront';
import { v4 as uuidv4 } from 'uuid';

export const handler = async (event: any, context: any) => {
  try {
    const { projectName, files, credentials, region = 'us-east-1', domain } = JSON.parse(event.body || '{}');
    
    if (!projectName || !files || !credentials) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify({ error: 'Missing required fields: projectName, files, credentials' })
      };
    }

    const s3Client = new S3Client({ region, credentials });
    const cloudFrontClient = new CloudFrontClient({ region, credentials });
    
    const bucketName = `deployhub-${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${uuidv4().slice(0, 8)}`;
    
    console.log(`Creating S3 bucket: ${bucketName}`);
    
    // Create S3 bucket
    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
    
    // Configure bucket for static website hosting
    await s3Client.send(new PutBucketWebsiteCommand({
      Bucket: bucketName,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: 'index.html' },
        ErrorDocument: { Key: 'error.html' }
      }
    }));
    
    // Set bucket policy for public read access
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${bucketName}/*`
        }
      ]
    };
    
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy)
    }));
    
    // Check project type and handle accordingly
    const hasPackageJson = files.some((f: any) => f.name === 'package.json');
    const htmlFiles = files.filter((f: any) => f.name.toLowerCase().endsWith('.html'));
    const hasStaticFiles = files.some((f: any) => 
      f.name.toLowerCase().endsWith('.html') || 
      f.name.toLowerCase().endsWith('.css') || 
      f.name.toLowerCase().endsWith('.js')
    );
    
    let indexHtmlFile = null;
    
    if (hasPackageJson) {
      // Framework project - HTML will be generated during build
      // Check if there's already an index.html, if not, we need to handle this differently
      const existingIndexHtml = htmlFiles.find((f: any) => f.name.toLowerCase() === 'index.html');
      if (existingIndexHtml) {
        indexHtmlFile = existingIndexHtml;
      } else {
        // For framework projects without index.html, we should return an error
        // as they need to be built first
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          },
          body: JSON.stringify({ 
            error: 'Framework project detected but no index.html found. Please build your project first and upload the built files.' 
          })
        };
      }
    } else if (hasStaticFiles) {
      // Static site - find HTML file
      indexHtmlFile = htmlFiles.find((f: any) => f.name.toLowerCase() === 'index.html') || htmlFiles[0];
      
      if (!indexHtmlFile) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          },
          body: JSON.stringify({ error: 'No HTML files found for static site. Please upload at least one HTML file.' })
        };
      }
    } else {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify({ error: 'No recognizable project files found. Please upload a valid project.' })
      };
    }

    // Upload files
    const uploadPromises = files.map((file: any) => {
      let key = file.name;
      
      // If this is the main HTML file and it's not already index.html, rename it
      if (file === indexHtmlFile && file.name.toLowerCase() !== 'index.html') {
        key = 'index.html';
      }
      
      return s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file.content,
        ContentType: file.type || (file.name.toLowerCase().endsWith('.html') ? 'text/html' : 'application/octet-stream')
      }));
    });
    
    
    await Promise.all(uploadPromises);
    
    // Create CloudFront distribution
    const distributionConfig = {
      CallerReference: `deployhub-${Date.now()}`,
      Comment: `DeployHub distribution for ${projectName}`,
      DefaultRootObject: 'index.html',
      Origins: {
        Quantity: 1,
        Items: [
          {
            Id: 'S3-Origin',
            DomainName: `${bucketName}.s3-website-${region}.amazonaws.com`,
            CustomOriginConfig: {
              HTTPPort: 80,
              HTTPSPort: 443,
              OriginProtocolPolicy: 'http-only' as any
            }
          }
        ]
      },
      DefaultCacheBehavior: {
        TargetOriginId: 'S3-Origin',
        ViewerProtocolPolicy: 'redirect-to-https' as any,
        AllowedMethods: {
          Quantity: 2,
          Items: ['GET', 'HEAD'] as any
        },
        Compress: true,
        ForwardedValues: {
          QueryString: false,
          Cookies: { Forward: 'none' as any }
        }
      },
      Enabled: true
    };
    
    const distribution = await cloudFrontClient.send(new CreateDistributionCommand({
      DistributionConfig: distributionConfig
    }));
    
    const distributionId = distribution.Distribution?.Id;
    const distributionDomain = distribution.Distribution?.DomainName;
    
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
        bucketName,
        distributionId,
        distributionDomain,
        websiteUrl: `http://${bucketName}.s3-website-${region}.amazonaws.com`,
        cloudFrontUrl: `https://${distributionDomain}`,
        message: 'Deployment successful!'
      })
    };
    
  } catch (error: any) {
    console.error('Deployment error:', error);
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
