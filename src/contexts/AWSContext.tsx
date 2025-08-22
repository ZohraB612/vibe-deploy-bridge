import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { 
  S3Client, 
  CreateBucketCommand, 
  PutBucketWebsiteCommand, 
  PutObjectCommand,
  PutBucketPolicyCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteBucketCommand
} from "@aws-sdk/client-s3";
import { 
  CloudFrontClient, 
  CreateDistributionCommand, 
  GetDistributionCommand,
  UpdateDistributionCommand,
  DeleteDistributionCommand,
  CreateInvalidationCommand
} from "@aws-sdk/client-cloudfront";
import { 
  CloudFormationClient, 
  CreateStackCommand, 
  DescribeStacksCommand,
  DeleteStackCommand,
  DescribeStackEventsCommand
} from "@aws-sdk/client-cloudformation";
import { 
  Route53Client, 
  ChangeResourceRecordSetsCommand,
  GetHostedZoneCommand,
  ListHostedZonesCommand
} from "@aws-sdk/client-route-53";
import { 
  ACMClient, 
  RequestCertificateCommand,
  DescribeCertificateCommand,
  DeleteCertificateCommand
} from "@aws-sdk/client-acm";
import { 
  STSClient, 
  AssumeRoleCommand 
} from "@aws-sdk/client-sts";

export interface AWSConnection {
  id: string;
  user_id: string;
  role_arn: string;
  external_id: string;
  account_id: string;
  region: string;
  status: 'connected' | 'disconnected' | 'error';
  created_at: string;
  updated_at: string;
}

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
}

export interface DeploymentResult {
  success: boolean;
  url?: string;
  distributionId?: string;
  bucketName?: string;
  error?: string;
  logs?: string[];
}

export interface StackEvent {
  timestamp: Date;
  resourceStatus: string;
  resourceType: string;
  logicalResourceId: string;
  resourceStatusReason?: string;
}

interface AWSContextType {
  connection: AWSConnection | null;
  credentials: AWSCredentials | null;
  isConnecting: boolean;
  error: string | null;
  
  // Connection management
  connectWithRole: (roleArn: string, externalId: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  validateRole: (roleArn: string, externalId: string) => Promise<boolean>;
  
  // Deployment operations
  deployToS3: (projectName: string, files: File[], domain?: string) => Promise<DeploymentResult>;
  deployWithCloudFormation: (projectName: string, files: File[], domain?: string) => Promise<DeploymentResult>;
  deleteDeployment: (projectName: string, distributionId?: string, bucketName?: string) => Promise<boolean>;
  
  // Domain operations
  provisionSSL: (domainName: string, hostedZoneId?: string) => Promise<boolean>;
  updateDNS: (domainName: string, hostedZoneId: string, records: any[]) => Promise<boolean>;
  findHostedZone: (domainName: string) => Promise<string | null>;
  
  // Monitoring
  getStackEvents: (stackName: string) => Promise<StackEvent[]>;
  getDistributionStatus: (distributionId: string) => Promise<string>;
  
  // Utility functions
  refreshConnection: () => Promise<void>;
}

const AWSContext = createContext<AWSContextType | undefined>(undefined);

export function useAWS() {
  const context = useContext(AWSContext);
  if (context === undefined) {
    throw new Error("useAWS must be used within an AWSProvider");
  }
  return context;
}

interface AWSProviderProps {
  children: ReactNode;
}

export function AWSProvider({ children }: AWSProviderProps) {
  const [connection, setConnection] = useState<AWSConnection | null>(null);
  const [credentials, setCredentials] = useState<AWSCredentials | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Initialize AWS clients when credentials change
  const getS3Client = useCallback(() => {
    if (!credentials) throw new Error("No AWS credentials available");
    return new S3Client({
      region: connection?.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
  }, [credentials, connection]);

  const getCloudFrontClient = useCallback(() => {
    if (!credentials) throw new Error("No AWS credentials available");
    return new CloudFrontClient({
      region: connection?.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
  }, [credentials, connection]);

  const getCloudFormationClient = useCallback(() => {
    if (!credentials) throw new Error("No AWS credentials available");
    return new CloudFormationClient({
      region: connection?.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
  }, [credentials, connection]);

  const getRoute53Client = useCallback(() => {
    if (!credentials) throw new Error("No AWS credentials available");
    return new Route53Client({
      region: connection?.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
  }, [credentials, connection]);

  const getACMClient = useCallback(() => {
    if (!credentials) throw new Error("No AWS credentials available");
    return new ACMClient({
      region: connection?.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
  }, [credentials, connection]);

  // Connect to AWS using IAM role
  const connectWithRole = useCallback(async (roleArn: string, externalId: string): Promise<boolean> => {
    if (!user) return false;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Create STS client with default credentials (from environment or IAM role)
      const stsClient = new STSClient({ region: 'us-east-1' });
      
      // Assume the role
      const assumeRoleCommand = new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `deployhub-${user.id}-${Date.now()}`,
        ExternalId: externalId,
        DurationSeconds: 3600, // 1 hour
      });
      
      const assumeRoleResult = await stsClient.send(assumeRoleCommand);
      
      if (!assumeRoleResult.Credentials) {
        throw new Error("Failed to assume role - no credentials returned");
      }
      
      // Store the temporary credentials
      const awsCredentials: AWSCredentials = {
        accessKeyId: assumeRoleResult.Credentials.AccessKeyId!,
        secretAccessKey: assumeRoleResult.Credentials.SecretAccessKey!,
        sessionToken: assumeRoleResult.Credentials.SessionToken!,
        expiration: assumeRoleResult.Credentials.Expiration!,
      };
      
      setCredentials(awsCredentials);
      
      // Create connection record
      const newConnection: AWSConnection = {
        id: crypto.randomUUID(),
        user_id: user.id,
        role_arn: roleArn,
        external_id: externalId,
        account_id: roleArn.split(':')[4] || 'unknown',
        region: 'us-east-1',
        status: 'connected',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setConnection(newConnection);
      
      // Test the connection by listing S3 buckets
      const s3Client = new S3Client({
        region: 'us-east-1',
        credentials: awsCredentials,
      });
      
      await s3Client.send(new ListObjectsV2Command({ Bucket: 'test-bucket-existence' }));
      
      return true;
    } catch (err: any) {
      if (err.name === 'NoSuchBucket') {
        // This is expected - we just wanted to test credentials
        return true;
      }
      
      setError(err.message || 'Failed to connect to AWS');
      console.error('AWS connection error:', err);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [user]);

  // Deploy to S3 with CloudFront
  const deployToS3 = useCallback(async (projectName: string, files: File[], domain?: string): Promise<DeploymentResult> => {
    if (!credentials || !connection) {
      throw new Error("AWS not connected");
    }
    
    const logs: string[] = [];
    const addLog = (message: string) => {
      logs.push(`${new Date().toISOString()}: ${message}`);
      console.log(message);
    };
    
    try {
      addLog("Starting deployment process...");
      
      const s3Client = getS3Client();
      const cloudFrontClient = getCloudFrontClient();
      
      // Create unique bucket name
      const bucketName = `${projectName.toLowerCase()}-deployhub-${Date.now()}`;
      addLog(`Creating S3 bucket: ${bucketName}`);
      
      // Create S3 bucket
      await s3Client.send(new CreateBucketCommand({
        Bucket: bucketName,
      }));
      
      addLog("S3 bucket created successfully");
      
      // Configure bucket for static website hosting
      await s3Client.send(new PutBucketWebsiteCommand({
        Bucket: bucketName,
        WebsiteConfiguration: {
          IndexDocument: { Suffix: 'index.html' },
          ErrorDocument: { Key: 'index.html' },
        },
      }));
      
      addLog("Static website hosting configured");
      
      // Upload files to S3
      addLog(`Uploading ${files.length} files...`);
      for (const file of files) {
        const key = file.name === 'index.html' ? 'index.html' : file.name;
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: file,
          ContentType: getContentType(file.name),
        }));
        addLog(`Uploaded: ${key}`);
      }
      
      addLog("All files uploaded successfully");
      
      // Create CloudFront distribution
      addLog("Creating CloudFront distribution...");
      const distributionCommand = new CreateDistributionCommand({
        DistributionConfig: {
          CallerReference: `${projectName}-${Date.now()}`,
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
            DefaultTTL: 86400, // 24 hours
          },
          Enabled: true,
          Origins: {
            Quantity: 1,
            Items: [
              {
                Id: `S3-${bucketName}`,
                DomainName: `${bucketName}.s3.${connection.region}.amazonaws.com`,
                S3OriginConfig: {
                  OriginAccessIdentity: '',
                },
              },
            ],
          },
          PriceClass: 'PriceClass_100', // Use only North America and Europe
        },
      });
      
      const distributionResult = await cloudFrontClient.send(distributionCommand);
      const distributionId = distributionResult.Distribution?.Id;
      const distributionDomain = distributionResult.Distribution?.DomainName;
      
      if (!distributionId || !distributionDomain) {
        throw new Error("Failed to create CloudFront distribution");
      }
      
      addLog(`CloudFront distribution created: ${distributionId}`);
      
      // Wait for distribution to be deployed
      addLog("Waiting for CloudFront distribution to deploy...");
      let isDeployed = false;
      let attempts = 0;
      
      while (!isDeployed && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;
        
        try {
          const statusResult = await cloudFrontClient.send(new GetDistributionCommand({
            Id: distributionId,
          }));
          
          if (statusResult.Distribution?.Status === 'Deployed') {
            isDeployed = true;
            addLog("CloudFront distribution is now deployed");
          } else {
            addLog(`Distribution status: ${statusResult.Distribution?.Status}`);
          }
        } catch (err) {
          addLog(`Error checking distribution status: ${err}`);
        }
      }
      
      if (!isDeployed) {
        addLog("Warning: Distribution deployment is taking longer than expected");
      }
      
      const result: DeploymentResult = {
        success: true,
        url: `https://${distributionDomain}`,
        distributionId,
        bucketName,
        logs,
      };
      
      addLog("Deployment completed successfully!");
      return result;
      
    } catch (err: any) {
      addLog(`Deployment failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        logs,
      };
    }
  }, [credentials, connection, getS3Client, getCloudFrontClient]);

  // Deploy using CloudFormation (more advanced)
  const deployWithCloudFormation = useCallback(async (projectName: string, files: File[], domain?: string): Promise<DeploymentResult> => {
    if (!credentials || !connection) {
      throw new Error("AWS not connected");
    }
    
    const logs: string[] = [];
    const addLog = (message: string) => {
      logs.push(`${new Date().toISOString()}: ${message}`);
      console.log(message);
    };
    
    try {
      addLog("Starting CloudFormation deployment...");
      
      const cloudFormationClient = getCloudFormationClient();
      const s3Client = getS3Client();
      
      // Create S3 bucket for CloudFormation artifacts
      const artifactsBucket = `${projectName}-artifacts-${Date.now()}`;
      await s3Client.send(new CreateBucketCommand({ Bucket: artifactsBucket }));
      
      // Upload files to artifacts bucket
      for (const file of files) {
        await s3Client.send(new PutObjectCommand({
          Bucket: artifactsBucket,
          Key: `artifacts/${file.name}`,
          Body: file,
          ContentType: getContentType(file.name),
        }));
      }
      
      // Create CloudFormation template
      const template = createCloudFormationTemplate(projectName, artifactsBucket, domain);
      
      // Create CloudFormation stack
      const stackName = `${projectName}-deployhub-stack`;
      const createStackCommand = new CreateStackCommand({
        StackName: stackName,
        TemplateBody: JSON.stringify(template),
        Capabilities: ['CAPABILITY_IAM'],
        Parameters: [
          {
            ParameterKey: 'ProjectName',
            ParameterValue: projectName,
          },
          {
            ParameterKey: 'ArtifactsBucket',
            ParameterValue: artifactsBucket,
          },
        ],
      });
      
      addLog("Creating CloudFormation stack...");
      await cloudFormationClient.send(createStackCommand);
      
      // Wait for stack creation
      addLog("Waiting for stack creation to complete...");
      let stackStatus = 'CREATE_IN_PROGRESS';
      let attempts = 0;
      
      while (stackStatus.includes('IN_PROGRESS') && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;
        
        try {
          const describeResult = await cloudFormationClient.send(new DescribeStacksCommand({
            StackName: stackName,
          }));
          
          stackStatus = describeResult.Stacks?.[0]?.StackStatus || 'UNKNOWN';
          addLog(`Stack status: ${stackStatus}`);
          
          if (stackStatus.includes('COMPLETE')) {
            break;
          } else if (stackStatus.includes('FAILED') || stackStatus.includes('ROLLBACK')) {
            throw new Error(`Stack creation failed: ${stackStatus}`);
          }
        } catch (err) {
          addLog(`Error checking stack status: ${err}`);
        }
      }
      
      if (stackStatus.includes('IN_PROGRESS')) {
        addLog("Warning: Stack creation is taking longer than expected");
      }
      
      // Get stack outputs
      const stackResult = await cloudFormationClient.send(new DescribeStacksCommand({
        StackName: stackName,
      }));
      
      const outputs = stackResult.Stacks?.[0]?.Outputs || [];
      const websiteUrl = outputs.find(o => o.OutputKey === 'WebsiteURL')?.OutputValue;
      const distributionId = outputs.find(o => o.OutputKey === 'DistributionID')?.OutputValue;
      
      const result: DeploymentResult = {
        success: true,
        url: websiteUrl,
        distributionId,
        bucketName: artifactsBucket,
        logs,
      };
      
      addLog("CloudFormation deployment completed successfully!");
      return result;
      
    } catch (err: any) {
      addLog(`CloudFormation deployment failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        logs,
      };
    }
  }, [credentials, connection, getCloudFormationClient, getS3Client]);

  // Helper function to find hosted zone for a domain
  const findHostedZone = useCallback(async (domainName: string): Promise<string | null> => {
    try {
      const route53Client = getRoute53Client();
      
      // List all hosted zones
      const zones = await route53Client.send(new ListHostedZonesCommand({}));
      
      // Find matching zone for domain
      const matchingZone = zones.HostedZones?.find(zone => {
        const zoneName = zone.Name?.replace(/\.$/, '') || '';
        return domainName === zoneName || domainName.endsWith(`.${zoneName}`);
      });
      
      return matchingZone?.Id || null;
    } catch (error) {
      console.error('Error finding hosted zone:', error);
      return null;
    }
  }, [getRoute53Client]);

  // Helper function to create DNS validation records for SSL certificates
  const createValidationRecords = useCallback(async (certificateArn: string, hostedZoneId: string): Promise<boolean> => {
    try {
      const acmClient = getACMClient();
      const route53Client = getRoute53Client();
      
      // Get certificate details to extract validation records
      const cert = await acmClient.send(new DescribeCertificateCommand({
        CertificateArn: certificateArn
      }));
      
      const validationOptions = cert.Certificate?.DomainValidationOptions;
      if (!validationOptions || validationOptions.length === 0) {
        throw new Error('No validation options found for certificate');
      }
      
      // Create validation DNS records
      for (const validation of validationOptions) {
        if (validation.ResourceRecord) {
          const changeCommand = new ChangeResourceRecordSetsCommand({
            HostedZoneId: hostedZoneId,
            ChangeBatch: {
              Changes: [{
                Action: 'UPSERT' as const,
                ResourceRecordSet: {
                  Name: validation.ResourceRecord.Name,
                  Type: validation.ResourceRecord.Type,
                  TTL: 300,
                  ResourceRecords: [{ Value: validation.ResourceRecord.Value }]
                }
              }]
            }
          });
          
          await route53Client.send(changeCommand);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error creating validation records:', error);
      return false;
    }
  }, [getACMClient, getRoute53Client]);

  // Helper function to wait for certificate issuance
  const waitForCertificateIssuance = useCallback(async (certificateArn: string): Promise<boolean> => {
    try {
      const acmClient = getACMClient();
      let isIssued = false;
      let attempts = 0;
      const maxAttempts = 60; // Wait up to 10 minutes (60 * 10 seconds)
      
      while (!isIssued && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;
        
        const cert = await acmClient.send(new DescribeCertificateCommand({
          CertificateArn: certificateArn
        }));
        
        const status = cert.Certificate?.Status;
        if (status === 'ISSUED') {
          isIssued = true;
        } else if (status === 'FAILED') {
          throw new Error(`Certificate validation failed: ${status}`);
        } else if (status === 'PENDING_VALIDATION') {
          console.log(`Certificate still pending validation... Attempt ${attempts}/${maxAttempts}`);
        }
      }
      
      return isIssued;
    } catch (error) {
      console.error('Error waiting for certificate issuance:', error);
      return false;
    }
  }, [getACMClient]);

  // Helper function to wait for DNS propagation
  const waitForDNSPropagation = useCallback(async (domainName: string, records: any[]): Promise<boolean> => {
    try {
      // Simple DNS propagation check - in production you might want to use a DNS lookup service
      // For now, we'll wait a reasonable time for DNS changes to propagate
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      return true;
    } catch (error) {
      console.error('Error waiting for DNS propagation:', error);
      return false;
    }
  }, []);

  // Provision SSL certificate
  const provisionSSL = useCallback(async (domainName: string, hostedZoneId?: string): Promise<boolean> => {
    try {
      if (!connection || !credentials) {
        throw new Error('AWS connection not established');
      }

      const acmClient = getACMClient();
      
      // If no hosted zone provided, try to find it
      let actualHostedZoneId = hostedZoneId;
      if (!actualHostedZoneId) {
        actualHostedZoneId = await findHostedZone(domainName);
        if (!actualHostedZoneId) {
          throw new Error(`No hosted zone found for domain: ${domainName}`);
        }
      }

      // Request SSL certificate
      const result = await acmClient.send(new RequestCertificateCommand({
        DomainName: domainName,
        ValidationMethod: 'DNS',
        SubjectAlternativeNames: [`*.${domainName}`],
        Tags: [
          { Key: 'Project', Value: 'VibeDeployBridge' },
          { Key: 'Domain', Value: domainName }
        ]
      }));

      if (!result.CertificateArn) {
        throw new Error('Failed to get certificate ARN');
      }

      console.log(`SSL certificate requested: ${result.CertificateArn}`);

      // Create DNS validation records
      const validationCreated = await createValidationRecords(result.CertificateArn, actualHostedZoneId);
      if (!validationCreated) {
        throw new Error('Failed to create validation records');
      }

      console.log('DNS validation records created, waiting for certificate issuance...');

      // Wait for certificate to be issued
      const isIssued = await waitForCertificateIssuance(result.CertificateArn);
      if (!isIssued) {
        throw new Error('Certificate issuance timeout or failed');
      }

      console.log('SSL certificate successfully issued!');
      return true;

    } catch (error) {
      console.error('Error provisioning SSL:', error);
      return false;
    }
  }, [connection, credentials, getACMClient, findHostedZone, createValidationRecords, waitForCertificateIssuance]);

  // Update DNS records
  const updateDNS = useCallback(async (domainName: string, hostedZoneId: string, records: any[]): Promise<boolean> => {
    try {
      if (!connection || !credentials) {
        throw new Error('AWS connection not established');
      }

      const route53Client = getRoute53Client();
      
      // If no hosted zone provided, try to find it
      let actualHostedZoneId = hostedZoneId;
      if (!actualHostedZoneId) {
        actualHostedZoneId = await findHostedZone(domainName);
        if (!actualHostedZoneId) {
          throw new Error(`No hosted zone found for domain: ${domainName}`);
        }
      }

      // Prepare DNS changes
      const changes = records.map(record => ({
        Action: 'UPSERT' as const,
        ResourceRecordSet: {
          Name: record.name,
          Type: record.type,
          TTL: record.ttl || 300,
          ResourceRecords: [{ Value: record.value }],
          ...(record.priority && { Priority: record.priority })
        }
      }));

      // Submit DNS changes
      const changeCommand = new ChangeResourceRecordSetsCommand({
        HostedZoneId: actualHostedZoneId,
        ChangeBatch: { Changes: changes }
      });

      const result = await route53Client.send(changeCommand);
      console.log('DNS changes submitted:', result.ChangeInfo?.Id);

      // Wait for DNS propagation
      await waitForDNSPropagation(domainName, records);

      return true;

    } catch (error) {
      console.error('Error updating DNS:', error);
      return false;
    }
  }, [connection, credentials, getRoute53Client, findHostedZone, waitForDNSPropagation]);

  // Get CloudFormation stack events
  const getStackEvents = useCallback(async (stackName: string): Promise<StackEvent[]> => {
    if (!credentials || !connection) {
      throw new Error("AWS not connected");
    }
    
    try {
      const cloudFormationClient = getCloudFormationClient();
      const result = await cloudFormationClient.send(new DescribeStackEventsCommand({
        StackName: stackName,
      }));
      
      return (result.StackEvents || []).map(event => ({
        timestamp: event.Timestamp!,
        resourceStatus: event.ResourceStatus!,
        resourceType: event.ResourceType!,
        logicalResourceId: event.LogicalResourceId!,
        resourceStatusReason: event.ResourceStatusReason,
      }));
    } catch (err: any) {
      console.error("Failed to get stack events:", err);
      return [];
    }
  }, [credentials, connection, getCloudFormationClient]);

  // Get CloudFront distribution status
  const getDistributionStatus = useCallback(async (distributionId: string): Promise<string> => {
    if (!credentials || !connection) {
      throw new Error("AWS not connected");
    }
    
    try {
      const cloudFrontClient = getCloudFrontClient();
      const result = await cloudFrontClient.send(new GetDistributionCommand({
        Id: distributionId,
      }));
      
      return result.Distribution?.Status || 'UNKNOWN';
    } catch (err: any) {
      console.error("Failed to get distribution status:", err);
      return 'ERROR';
    }
  }, [credentials, connection, getCloudFrontClient]);

  // Delete deployment
  const deleteDeployment = useCallback(async (projectName: string, distributionId?: string, bucketName?: string): Promise<boolean> => {
    if (!credentials || !connection) {
      throw new Error("AWS not connected");
    }
    
    try {
      const s3Client = getS3Client();
      const cloudFrontClient = getCloudFrontClient();
      
      // Delete CloudFront distribution
      if (distributionId) {
        await cloudFrontClient.send(new DeleteDistributionCommand({
          Id: distributionId,
          IfMatch: 'ETAG_PLACEHOLDER', // You'd need to get the actual ETag
        }));
      }
      
      // Delete S3 bucket contents and bucket
      if (bucketName) {
        const objects = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }));
        
                 if (objects.Contents && objects.Contents.length > 0) {
           // Delete objects one by one (DeleteObjectsCommand doesn't exist in v3)
           for (const obj of objects.Contents) {
             if (obj.Key) {
               await s3Client.send(new DeleteObjectCommand({
                 Bucket: bucketName,
                 Key: obj.Key,
               }));
             }
           }
         }
        
        await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
      }
      
      return true;
    } catch (err: any) {
      console.error("Deployment deletion failed:", err);
      return false;
    }
  }, [credentials, connection, getS3Client, getCloudFrontClient]);

  // Validate AWS role
  const validateRole = useCallback(async (roleArn: string, externalId: string): Promise<boolean> => {
    try {
      const stsClient = new STSClient({ region: 'us-east-1' });
      
      const assumeRoleCommand = new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `deployhub-validation-${Date.now()}`,
        ExternalId: externalId,
        DurationSeconds: 900, // 15 minutes for validation
      });
      
      const result = await stsClient.send(assumeRoleCommand);
      return !!result.Credentials;
    } catch (err) {
      return false;
    }
  }, []);

  // Disconnect from AWS
  const disconnect = useCallback(async (): Promise<void> => {
    setCredentials(null);
    setConnection(null);
    setError(null);
  }, []);

  // Refresh connection
  const refreshConnection = useCallback(async (): Promise<void> => {
    if (connection && credentials) {
      // Check if credentials are still valid
      if (new Date() > credentials.expiration) {
        await disconnect();
      }
    }
  }, [connection, credentials, disconnect]);

  // Check credentials expiration periodically
  useEffect(() => {
    if (credentials) {
      const checkExpiration = () => {
        if (new Date() > credentials.expiration) {
          disconnect();
        }
      };
      
      const interval = setInterval(checkExpiration, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [credentials, disconnect]);

  const value: AWSContextType = {
    connection,
    credentials,
    isConnecting,
    error,
    connectWithRole,
    disconnect,
    validateRole,
    deployToS3,
    deployWithCloudFormation,
    deleteDeployment,
    provisionSSL,
    updateDNS,
    findHostedZone,
    getStackEvents,
    getDistributionStatus,
    refreshConnection,
  };

  return (
    <AWSContext.Provider value={value}>
      {children}
    </AWSContext.Provider>
  );
}

// Helper function to get content type
function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return 'text/html';
    case 'css': return 'text/css';
    case 'js': return 'application/javascript';
    case 'json': return 'application/json';
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'ico': return 'image/x-icon';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}

// Helper function to create CloudFormation template
function createCloudFormationTemplate(projectName: string, artifactsBucket: string, domain?: string) {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: `DeployHub infrastructure for ${projectName}`,
    Parameters: {
      ProjectName: {
        Type: 'String',
        Default: projectName,
        Description: 'Name of the project',
      },
      ArtifactsBucket: {
        Type: 'String',
        Default: artifactsBucket,
        Description: 'S3 bucket containing deployment artifacts',
      },
    },
    Resources: {
      WebsiteBucket: {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: `!Sub '${projectName}-website-\${AWS::AccountId}-\${AWS::Region}'`,
          WebsiteConfiguration: {
            IndexDocument: 'index.html',
            ErrorDocument: 'index.html',
          },
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            BlockPublicPolicy: false,
            IgnorePublicAcls: false,
            RestrictPublicBuckets: false,
          },
        },
      },
      WebsiteBucketPolicy: {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
          Bucket: { Ref: 'WebsiteBucket' },
          PolicyDocument: {
            Statement: [
              {
                Sid: 'PublicReadGetObject',
                Effect: 'Allow',
                Principal: '*',
                Action: 's3:GetObject',
                Resource: { 'Fn::Sub': '${WebsiteBucket}/*' },
              },
            ],
          },
        },
      },
      CloudFrontDistribution: {
        Type: 'AWS::CloudFront::Distribution',
        Properties: {
          DistributionConfig: {
            Origins: [
              {
                Id: 'S3Origin',
                DomainName: { 'Fn::GetAtt': ['WebsiteBucket', 'RegionalDomainName'] },
                S3OriginConfig: {
                  OriginAccessIdentity: '',
                },
              },
            ],
            Enabled: true,
            DefaultCacheBehavior: {
              TargetOriginId: 'S3Origin',
              ViewerProtocolPolicy: 'redirect-to-https',
              AllowedMethods: ['GET', 'HEAD'],
              CachedMethods: ['GET', 'HEAD'],
              Compress: true,
              DefaultTTL: 86400,
            },
            PriceClass: 'PriceClass_100',
          },
        },
      },
    },
    Outputs: {
      WebsiteURL: {
        Description: 'URL of the deployed website',
        Value: { 'Fn::GetAtt': ['WebsiteBucket', 'WebsiteURL'] },
      },
      DistributionID: {
        Description: 'CloudFront distribution ID',
        Value: { Ref: 'CloudFrontDistribution' },
      },
      DistributionDomain: {
        Description: 'CloudFront distribution domain',
        Value: { 'Fn::GetAtt': ['CloudFrontDistribution', 'DomainName'] },
      },
    },
  };
}
