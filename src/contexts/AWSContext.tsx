import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";
import { 
  S3Client, 
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteBucketCommand
} from "@aws-sdk/client-s3";
import { 
  CloudFrontClient, 
  GetDistributionCommand,
  UpdateDistributionCommand,
  DeleteDistributionCommand,
  CreateInvalidationCommand
} from "@aws-sdk/client-cloudfront";
import { 
  CloudFormationClient, 
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
  AssumeRoleCommand,
  AssumeRoleWithWebIdentityCommand
} from "@aws-sdk/client-sts";

export interface AWSConnection {
  id: string;
  user_id: string;
  role_arn: string;
  external_id: string;
  account_id: string;
  region: string;
  is_active: boolean;
  last_validated_at?: string | null;
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

// Add proper types for DNS records
interface DNSRecord {
  id?: string;
  name: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';
  value: string;
  ttl?: number;
  priority?: number; // For MX records
  status?: 'pending' | 'active' | 'error';
}

interface AWSContextType {
  connection: AWSConnection | null;
  credentials: AWSCredentials | null;
  isConnecting: boolean;
  error: string | null;
  
  // Connection management
  connectWithRole: (roleArn: string, externalId: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  validateRole: (roleArn: string) => Promise<{valid: boolean, accountId?: string, error?: string}>;
  
  // Deployment operations
  deployToS3: (projectName: string, files: File[], domain?: string) => Promise<DeploymentResult>;
  deployWithCloudFormation: (projectName: string, files: File[], domain?: string) => Promise<DeploymentResult>;
  deployWithTerraform: (projectName: string, files: File[], domain?: string) => Promise<DeploymentResult>;
  deleteDeployment: (projectName: string, distributionId?: string, bucketName?: string) => Promise<boolean>;
  
  // Domain operations
  provisionSSL: (domainName: string, hostedZoneId?: string) => Promise<boolean>;
  updateDNS: (domainName: string, hostedZoneId: string, records: DNSRecord[]) => Promise<boolean>;
  findHostedZone: (domainName: string) => Promise<string | null>;
  
  // Monitoring
  getStackEvents: (stackName: string) => Promise<StackEvent[]>;
  getDistributionStatus: (distributionId: string) => Promise<string>;
  
  // Utility functions
  refreshConnection: () => Promise<void>;
  
  // Credential management
  refreshCredentials: () => Promise<boolean>;
  getConnectionStatus: () => Promise<{connected: boolean, error?: string}>;
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
      // Validate ARN format
      const arnRegex = /^arn:aws:iam::(\d{12}):role\/[\w+=,.@-]+$/;
      if (!arnRegex.test(roleArn)) {
        throw new Error("Invalid Role ARN format");
      }
      
      // Extract account ID
      const accountId = roleArn.split(':')[4];
      
      // Check if user already has an AWS connection
      const { data: existingConnection, error: fetchError } = await supabase
        .from('aws_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.warn('Error checking existing connection:', fetchError);
      }
      
      // Call secure backend API to assume user's role
      try {
        const apiUrl = import.meta.env.VITE_DEPLOYHUB_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
        
        const response = await fetch(`${apiUrl}/assume-role`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roleArn,
            externalId,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success || !result.credentials) {
          throw new Error('Invalid response from role assumption service');
        }

        const awsCredentials: AWSCredentials = {
          accessKeyId: result.credentials.accessKeyId,
          secretAccessKey: result.credentials.secretAccessKey,
          sessionToken: result.credentials.sessionToken,
          expiration: new Date(result.credentials.expiration),
        };

        setCredentials(awsCredentials);
        console.log('✅ Successfully obtained real AWS credentials from secure backend');
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Backend role assumption failed';
        console.error('❌ Backend role assumption failed:', errorMessage);
        setError(`Failed to assume AWS role: ${errorMessage}`);
        
        // No fallback - only use real credentials from the backend
        throw error;
      }
      
      // Use existing connection or create new one
      const connectionToUse = existingConnection || {
        id: crypto.randomUUID(),
        user_id: user.id,
        role_arn: roleArn,
        external_id: externalId,
        account_id: accountId,
        region: 'us-east-1',
        is_active: true,
        last_validated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Update the connection with new role details
      connectionToUse.role_arn = roleArn;
      connectionToUse.external_id = externalId;
      connectionToUse.account_id = accountId;
      connectionToUse.last_validated_at = new Date().toISOString();
      connectionToUse.updated_at = new Date().toISOString();
      
      setConnection(connectionToUse);
      
      // Save connection to Supabase - use upsert with conflict resolution on user_id
      const { error: dbError } = await supabase
        .from('aws_connections')
        .upsert({
          id: connectionToUse.id,
          user_id: user.id,
          role_arn: roleArn,
          external_id: externalId,
          account_id: accountId,
          region: 'us-east-1',
          is_active: true,
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
      
      if (dbError) {
        console.warn('Failed to save AWS connection to database:', dbError);
        // Don't fail the connection for database issues
      }
      
      return true;
    } catch (err: any) {
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
      addLog("Starting S3 deployment...");
      addLog("Using backend API for deployment to avoid CORS issues...");
      
      // Prepare files for backend API (convert to base64)
      const preparedFiles = await Promise.all(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          return {
            name: file.name,
            content: base64Content
          };
        })
      );
      
      // Call backend API for deployment
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? 'https://your-production-api.com' 
        : 'http://localhost:3001';
      
      addLog("Calling backend deployment API...");
      const response = await fetch(`${apiUrl}/deploy-s3-enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName,
          files: preparedFiles,
          domain,
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken,
          },
          region: connection?.region || 'us-east-1',
          enableBuild: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed with status: ${response.status}`);
      }
      
      const deploymentResult = await response.json();
      
      if (!deploymentResult.success) {
        throw new Error(deploymentResult.error || 'Deployment failed');
      }
      
      addLog("Backend deployment completed successfully!");
      addLog(`S3 bucket: ${deploymentResult.bucketName}`);
      addLog(`CloudFront distribution: ${deploymentResult.distributionId}`);
      addLog(`Website URL: ${deploymentResult.websiteUrl}`);
      
      const result: DeploymentResult = {
        success: true,
        url: deploymentResult.websiteUrl,
        distributionId: deploymentResult.distributionId,
        bucketName: deploymentResult.bucketName,
        logs,
      };
      
      addLog("S3 deployment completed successfully!");
      return result;
      
    } catch (err: any) {
      addLog(`S3 deployment failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        logs,
      };
    }
  }, [credentials, connection]);

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
      addLog("Using backend API for deployment to avoid CORS issues...");
      
      // For now, redirect to the main deployment method since CloudFormation is complex
      // In the future, we can create a separate CloudFormation backend endpoint
      addLog("Redirecting to standard deployment method...");
      
      return await deployToS3(projectName, files, domain);
      
    } catch (err: any) {
      addLog(`CloudFormation deployment failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        logs,
      };
    }
  }, [credentials, connection, deployToS3]);

  // Deploy using Terraform (new infrastructure approach)
  const deployWithTerraform = useCallback(async (projectName: string, files: File[], domain?: string): Promise<DeploymentResult> => {
    if (!credentials || !connection) {
      throw new Error("AWS not connected");
    }
    
    const logs: string[] = [];
    const addLog = (message: string) => {
      logs.push(`${new Date().toISOString()}: ${message}`);
      console.log(message);
    };
    
    try {
      addLog("Starting Terraform deployment...");
      
      // Use backend API to avoid CORS issues
      addLog("Using backend API for deployment to avoid CORS issues...");
      
      // Prepare files for backend API (convert to base64)
      const preparedFiles = await Promise.all(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          return {
            name: file.name,
            content: base64Content
          };
        })
      );
      
      // Call backend API for deployment
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? 'https://your-production-api.com' 
        : 'http://localhost:3001';
      
      addLog("Calling backend deployment API...");
      const response = await fetch(`${apiUrl}/deploy-s3-enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName,
          files: preparedFiles,
          domain,
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken,
          },
          region: connection?.region || 'us-east-1',
          enableBuild: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed with status: ${response.status}`);
      }
      
      const deploymentResult = await response.json();
      
      if (!deploymentResult.success) {
        throw new Error(deploymentResult.error || 'Deployment failed');
      }
      
      addLog("Backend deployment completed successfully!");
      addLog(`S3 bucket: ${deploymentResult.bucketName}`);
      addLog(`CloudFront distribution: ${deploymentResult.distributionId}`);
      addLog(`Website URL: ${deploymentResult.websiteUrl}`);
      
      const result: DeploymentResult = {
        success: true,
        url: deploymentResult.websiteUrl,
        distributionId: deploymentResult.distributionId,
        bucketName: deploymentResult.bucketName,
        logs,
      };
      
      return result;
      
    } catch (err: any) {
      addLog(`Terraform deployment failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        logs,
      };
    }
  }, [credentials, connection]);



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
  const updateDNS = useCallback(async (domainName: string, hostedZoneId: string, records: DNSRecord[]): Promise<boolean> => {
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

  // Validate AWS role (format only - actual role testing happens during connection)
  const validateRole = useCallback(async (roleArn: string): Promise<{valid: boolean, accountId?: string, error?: string}> => {
    try {
      // Validate ARN format
      const arnRegex = /^arn:aws:iam::(\d{12}):role\/[\w+=,.@-]+$/;
      if (!arnRegex.test(roleArn)) {
        return {
          valid: false,
          error: "Invalid ARN format. Expected: arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME"
        };
      }

      // Extract account ID from ARN
      const accountId = roleArn.split(':')[4];
      
      return {
        valid: true,
        accountId: accountId
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate role';
      console.error('Failed to validate role:', error);
      return { valid: false, error: errorMessage };
    }
  }, []);

  // Disconnect from AWS
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      // Delete the connection from the database
      if (connection) {
        const { error } = await supabase
          .from('aws_connections')
          .delete()
          .eq('id', connection.id);
        
        if (error) {
          console.warn('Failed to delete connection from database:', error);
        } else {
          console.log('Successfully deleted connection from database');
        }
      }
      
      // Clear local state
      setCredentials(null);
      setConnection(null);
      setError(null);
    } catch (err) {
      console.warn('Error during disconnect:', err);
      // Still clear local state even if database deletion fails
      setCredentials(null);
      setConnection(null);
      setError(null);
    }
  }, [connection]);

  // Refresh connection
  const refreshConnection = useCallback(async () => {
    if (!connection) return;
    
    try {
      const isValid = await validateRole(connection.role_arn);
      if (!isValid.valid) {
        setError('Role validation failed');
        return;
      }
      
      // Refresh credentials
      const newCredentials = await getCredentialsFromRole(connection.role_arn, connection.external_id);
      if (newCredentials) {
        setCredentials(newCredentials);
        setError(null);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh connection';
      setError(errorMessage);
    }
  }, [connection, validateRole]);

  const refreshCredentials = useCallback(async (): Promise<boolean> => {
    if (!connection) return false;
    
    try {
      const newCredentials = await getCredentialsFromRole(connection.role_arn, connection.external_id);
      if (newCredentials) {
        setCredentials(newCredentials);
        return true;
      }
      return false;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh credentials';
      console.error('Failed to refresh credentials:', err);
      setError(errorMessage);
      return false;
    }
  }, [connection]);

  const getConnectionStatus = useCallback(async (): Promise<{connected: boolean, error?: string}> => {
    if (!connection) {
      return { connected: false, error: 'No connection configured' };
    }
    
    try {
      const isValid = await validateRole(connection.role_arn);
      return { 
        connected: isValid.valid, 
        error: isValid.valid ? undefined : isValid.error 
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check connection status';
      return { connected: false, error: errorMessage };
    }
  }, [connection, validateRole]);

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

  // Load existing AWS connection on mount
  useEffect(() => {
    const loadExistingConnection = async () => {
      if (user) {
        try {
          const { data: existingConnection, error } = await supabase
            .from('aws_connections')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();
          
          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.warn('Supabase connection issue, continuing without AWS connection:', error);
          } else if (existingConnection) {
            console.log('🔍 AWSContext: Loading existing connection:', existingConnection);
            setConnection(existingConnection);
            
            // Call backend to assume existing role
            try {
              const apiUrl = import.meta.env.VITE_DEPLOYHUB_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
              
              const response = await fetch(`${apiUrl}/assume-role`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  roleArn: existingConnection.role_arn,
                  externalId: existingConnection.external_id,
                  userId: user.id,
                }),
              });

              if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.credentials) {
                  const awsCredentials: AWSCredentials = {
                    accessKeyId: result.credentials.accessKeyId,
                    secretAccessKey: result.credentials.secretAccessKey,
                    sessionToken: result.credentials.sessionToken,
                    expiration: new Date(result.credentials.expiration),
                  };
                  setCredentials(awsCredentials);
                  console.log('🔍 AWSContext: Successfully obtained credentials for existing connection');
                }
              } else {
                const errorData = await response.json();
                console.warn('Failed to assume existing role:', errorData.error);
              }
              
            } catch (error: any) {
              console.warn('Failed to assume role for existing connection:', error.message);
              // Don't set error state for existing connections - just log the warning
              // The user can still reconnect if needed
            }
          } else {
            console.log('🔍 AWSContext: No existing connection found for user:', user.id);
          }
        } catch (err) {
          console.warn('Failed to load existing AWS connection:', err);
        }
      }
    };

    loadExistingConnection();
  }, [user]);

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
    deployWithTerraform,
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


