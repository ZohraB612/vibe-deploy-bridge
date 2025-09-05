import {
  S3Client,
  CreateBucketCommand,
  PutBucketWebsiteCommand,
  PutBucketPolicyCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  PutPublicAccessBlockCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  CreateDistributionCommand,
  CreateInvalidationCommand,
  GetDistributionCommand
} from "@aws-sdk/client-cloudfront";
import * as unzipper from 'unzipper';
import { Readable } from 'stream';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { ProjectDetector, DetectedProject } from './project-detector';
import { BuildPipeline, BuildResult } from './build-pipeline';

export interface EnhancedDeploymentResult {
  success: boolean;
  bucketName?: string;
  distributionId?: string;
  websiteUrl?: string;
  projectType?: string;
  buildLogs?: string[];
  error?: string;
  message?: string;
}

// Enhanced S3 deployment with build pipeline
export async function deployToS3Enhanced(event: { httpMethod: string; body?: string }): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
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
      region = 'us-east-1',
      enableBuild = true // New parameter to enable/disable build pipeline
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

    console.log(`🚀 Starting enhanced deployment for project: ${projectName}`);
    console.log(`📁 Processing ${files.length} files`);
    console.log(`🔧 Build pipeline enabled: ${enableBuild}`);

    // Step 1: Detect project type
    let detectedProject: DetectedProject;
    let buildResult: BuildResult | null = null;
    let filesToDeploy = files;

    if (enableBuild) {
      console.log('🔍 Detecting project type...');
      detectedProject = await ProjectDetector.detectProjectType(files);
      console.log(`📋 Detected project type: ${detectedProject.projectType.type} (confidence: ${detectedProject.projectType.confidence})`);
      console.log(`📄 Detected files: ${detectedProject.projectType.detectedFiles.join(', ')}`);

      // Step 2: Build project if needed
      if (detectedProject.projectType.type !== 'static' && detectedProject.projectType.type !== 'unknown') {
        console.log('🔨 Building project...');
        buildResult = await BuildPipeline.buildProject({
          projectName,
          files,
          projectType: detectedProject.projectType,
          packageJson: detectedProject.packageJson,
          buildScripts: detectedProject.buildScripts
        });

        if (!buildResult.success) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              success: false,
              error: `Build failed: ${buildResult.error}`,
              projectType: detectedProject.projectType.type,
              buildLogs: buildResult.logs
            })
          };
        }

        console.log(`✅ Build completed successfully in ${buildResult.buildTime}ms`);
        console.log(`📦 Build output directory: ${buildResult.outputDir}`);

        // Convert built files to the expected format
        filesToDeploy = await convertBuildOutputToFiles(buildResult.outputDir);
        console.log(`📁 Converted ${filesToDeploy.length} built files for deployment`);
      } else {
        console.log('📄 Static project detected, skipping build step');
      }
    } else {
      console.log('⏭️ Build pipeline disabled, using files as-is');
      detectedProject = {
        projectType: { type: 'static', confidence: 1, detectedFiles: [] },
        configFiles: [],
        hasNodeModules: false,
        buildScripts: []
      };
    }

    // Step 3: Deploy to S3 (existing logic)
    const deploymentResult = await deployToS3Core(projectName, filesToDeploy, domain, credentials, region);

    // Step 4: Return enhanced response
    const response: EnhancedDeploymentResult = {
      success: deploymentResult.success,
      bucketName: deploymentResult.bucketName,
      distributionId: deploymentResult.distributionId,
      websiteUrl: deploymentResult.websiteUrl,
      projectType: detectedProject.projectType.type,
      buildLogs: buildResult?.logs,
      error: deploymentResult.error,
      message: deploymentResult.message
    };

    return {
      statusCode: deploymentResult.success ? 200 : 500,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error: unknown) {
    console.error('❌ Enhanced deployment failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during deployment';
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage
      })
    };
  }
}

// Convert build output directory to files array
async function convertBuildOutputToFiles(outputDir: string): Promise<{ name: string; content: string }[]> {
  const files: { name: string; content: string }[] = [];
  
  try {
    await processDirectory(outputDir, '', files);
    return files;
  } catch (error) {
    console.error('Error converting build output:', error);
    throw new Error(`Failed to convert build output: ${error}`);
  }
}

async function processDirectory(dirPath: string, relativePath: string, files: { name: string; content: string }[]): Promise<void> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    const fileRelativePath = relativePath ? join(relativePath, entry.name) : entry.name;
    
    if (entry.isDirectory()) {
      await processDirectory(fullPath, fileRelativePath, files);
    } else if (entry.isFile()) {
      try {
        const fileStats = await stat(fullPath);
        const fileBuffer = await import('fs').then(fs => fs.promises.readFile(fullPath));
        const base64Content = fileBuffer.toString('base64');
        
        files.push({
          name: fileRelativePath,
          content: base64Content
        });
        
        console.log(`📄 Added file: ${fileRelativePath} (${fileStats.size} bytes)`);
      } catch (fileError) {
        console.warn(`⚠️ Failed to process file ${fileRelativePath}:`, fileError);
      }
    }
  }
}

// Core S3 deployment logic (extracted from original deploy-s3.ts)
async function deployToS3Core(
  projectName: string,
  files: { name: string; content: string }[],
  domain: string | undefined,
  credentials: any,
  region: string
): Promise<{
  success: boolean;
  bucketName?: string;
  distributionId?: string;
  websiteUrl?: string;
  error?: string;
  message?: string;
}> {
  try {
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

    console.log(`🪣 Creating S3 bucket: ${bucketName}`);

    // Create S3 bucket
    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
    console.log("✅ S3 bucket created successfully");
    
    // Wait for bucket to be available
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Disable block public access settings to allow public read policies
    await s3Client.send(new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        BlockPublicPolicy: false,
        IgnorePublicAcls: false,
      },
    }));

    // Configure bucket for static website hosting
    await s3Client.send(new PutBucketWebsiteCommand({
      Bucket: bucketName,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: 'index.html' },
        ErrorDocument: { Key: 'error.html' },
      },
    }));

    // Set bucket policy to allow public read access
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${bucketName}/*`,
        },
      ],
    };

    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy),
    }));

    // Configure CORS
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    }));

    console.log("✅ S3 bucket configured for static website hosting");

    // Upload files to S3
    console.log(`📤 Uploading ${files.length} files to S3...`);
    
    for (const file of files) {
      try {
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(file.content, 'base64');
        
        if (file.name.toLowerCase().endsWith('.zip')) {
          // Handle ZIP file - extract and upload contents
          console.log(`📦 Extracting ZIP file: ${file.name}`);
          
          const entries = await unzipper.Open.buffer(fileBuffer);
          
          for (const entry of entries.files) {
            if (!entry.type || entry.type === 'File') {
              const content = await entry.buffer();
              const key = entry.path;
              
              // Skip hidden files and directories
              if (key.startsWith('__MACOSX/') || key.startsWith('.DS_Store') || key.includes('/.')) {
                continue;
              }
              
              console.log(`📄 Uploading extracted file: ${key}`);
              
              await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: content,
                ContentType: getContentType(key),
              }));
              
              console.log(`✅ Successfully uploaded: ${key}`);
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
          
          console.log(`✅ Successfully uploaded: ${file.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${file.name}:`, error);
        throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Create CloudFront distribution
    console.log("☁️ Creating CloudFront distribution...");
    
    const distributionResult = await cloudFrontClient.send(new CreateDistributionCommand({
      DistributionConfig: {
        CallerReference: `${projectName}-${Date.now()}`,
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
                OriginProtocolPolicy: 'http-only',
              },
            },
          ],
        },
        DefaultCacheBehavior: {
          TargetOriginId: 'S3-Origin',
          ViewerProtocolPolicy: 'redirect-to-https',
          AllowedMethods: {
            Quantity: 2,
            Items: ['GET', 'HEAD'],
          },
          Compress: true,
          ForwardedValues: {
            QueryString: false,
            Cookies: { Forward: 'none' },
          },
        },
        Enabled: true,
        PriceClass: 'PriceClass_100',
      },
    }));

    const distributionId = distributionResult.Distribution?.Id;
    const domainName = distributionResult.Distribution?.DomainName;
    const websiteUrl = `https://${domainName}`;

    console.log(`✅ CloudFront distribution created: ${distributionId}`);
    console.log(`🌐 Website URL: ${websiteUrl}`);

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
      console.log("✅ CloudFront invalidation created");
    } catch (error) {
      console.warn("⚠️ CloudFront invalidation failed:", error);
      // Don't fail the entire deployment for invalidation issues
    }

    return {
      success: true,
      bucketName,
      distributionId,
      websiteUrl,
      message: 'Deployment completed successfully'
    };

  } catch (error: unknown) {
    console.error('❌ S3 deployment failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during deployment';
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Helper function to determine content type
function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text/html';
    case 'css':
      return 'text/css';
    case 'js':
      return 'application/javascript';
    case 'json':
      return 'application/json';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'ico':
      return 'image/x-icon';
    case 'txt':
      return 'text/plain';
    case 'pdf':
      return 'application/pdf';
    case 'zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}
