import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAWS } from "@/contexts/AWSContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { 
  CheckCircle, 
  Copy, 
  ExternalLink, 
  Shield, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle,
  Cloud
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    id: 1,
    title: "Why Connect AWS?",
    description: "Understanding the secure connection process"
  },
  {
    id: 2,
    title: "Create IAM Role",
    description: "Set up permissions in your AWS account"
  },
  {
    id: 3,
    title: "Configure Policy",
    description: "Add the required permissions policy"
  },
  {
    id: 4,
    title: "Enter Role ARN", 
    description: "Complete the connection"
  }
];

const awsPolicy = {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DeployHubS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:PutBucketWebsite",
        "s3:PutBucketPolicy",
        "s3:GetBucketPolicy",
        "s3:DeleteBucketPolicy"
      ],
      "Resource": [
        "arn:aws:s3:::deployhub-*",
        "arn:aws:s3:::deployhub-*/*"
      ]
    },
    {
      "Sid": "DeployHubCloudFrontAccess",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateDistribution",
        "cloudfront:UpdateDistribution",
        "cloudfront:DeleteDistribution",
        "cloudfront:GetDistribution",
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DeployHubCloudFormationAccess",
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:ValidateTemplate"
      ],
      "Resource": "arn:aws:cloudformation:*:*:stack/deployhub-*"
    },
    {
      "Sid": "DeployHubRoute53Access",
      "Effect": "Allow",
      "Action": [
        "route53:GetHostedZone",
        "route53:ListHostedZones",
        "route53:ChangeResourceRecordSets",
        "route53:GetChange"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DeployHubACMAccess",
      "Effect": "Allow",
      "Action": [
        "acm:RequestCertificate",
        "acm:DescribeCertificate",
        "acm:DeleteCertificate",
        "acm:ListCertificates"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DeployHubIAMPassRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::*:role/deployhub-*"
      },
    {
      "Sid": "DeployHubSTSAssumeRole",
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::*:role/deployhub-*"
    },
    {
      "Sid": "DeployHubCloudWatchAccess",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "cloudwatch:GetMetricData",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DeployHubLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/deployhub/*"
    }
  ]
};

export default function AWSSetup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [roleArn, setRoleArn] = useState("");
  
  // Use the fixed external ID that the IAM role trusts
  const [externalId] = useState("deployhub-trusted-service");

  // Generate the trust policy with the current external ID
  const trustPolicy = {
    "Version": "2012-10-17", 
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::599248138183:role/DeployHubLambdaRole"
        },
        "Action": "sts:AssumeRole",
        "Condition": {
          "StringEquals": {
            "sts:ExternalId": externalId
          }
        }
      }
    ]
  };
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connectWithRole, isConnecting, error, connection, validateRole } = useAWS();

  const copyToClipboard = (text: string | object) => {
    const textToCopy = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Copied to clipboard",
      description: "The configuration has been copied to your clipboard.",
    });
  };

  const validateAndSubmit = async () => {
    if (!roleArn.trim()) {
      toast({
        title: "Role ARN Required",
        description: "Please enter a valid AWS IAM role ARN",
        variant: "destructive"
      });
      return;
    }

    // Validate role format first
    try {
      const validation = await validateRole(roleArn);
      if (!validation.valid) {
        toast({
          title: "Invalid Role ARN",
          description: validation.error || "Please check your role ARN format",
          variant: "destructive"
        });
        return;
      }

      // Call the new secure backend to verify and store the connection
      
      const apiUrl = import.meta.env.VITE_DEPLOYHUB_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';
      
      const response = await fetch(`${apiUrl}/connect-aws-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleArn,
          externalId,
          userId: user?.id,
          accountId: validation.accountId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (result.success) {
        // Now connect using the traditional method to store locally
        const success = await connectWithRole(roleArn, externalId);
        
        if (success) {
      toast({
        title: "AWS Account Connected!",
            description: `Successfully verified and connected to account ${validation.accountId}`,
          });
          navigate("/dashboard");
        } else {
          toast({
            title: "Local Storage Failed",
            description: "Verification succeeded but local connection failed. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        throw new Error("Verification failed");
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to validate role';
      toast({
        title: "Connection Failed",
        description: errorMessage || "Failed to verify AWS role connection. Please check your role configuration.",
        variant: "destructive"
      });
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
              <Cloud className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Connect Your AWS Account</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Follow these simple steps to securely connect your AWS account and start deploying your applications.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : "border-muted bg-background text-muted-foreground"
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Step {currentStep}</Badge>
              <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            </div>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Why Connect */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="bg-gradient-subtle p-6 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Secure, Direct Access</h3>
                      <p className="text-muted-foreground">
                        DeployHub needs secure access to your AWS account to deploy your applications. 
                        We use AWS IAM roles - the industry standard for secure, limited access that you control.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 text-success">✓ What we do</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Deploy your applications securely</li>
                      <li>• Manage cloud infrastructure for you</li>
                      <li>• Only access what's needed for deployments</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 text-destructive">✗ What we never do</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Access your personal data</li>
                      <li>• Share your AWS credentials</li>
                      <li>• Make changes outside deployments</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Create IAM Role */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">Before you start</p>
                      <p className="text-blue-700">Make sure you're logged into your AWS account and have IAM permissions.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <h4 className="font-medium mb-2 text-green-800">🚀 Step 1: Create the DeployHub Policy First</h4>
                    <p className="text-sm text-green-700 mb-3">
                      We'll create the policy first, then create the role. This makes the process much smoother!
                    </p>
                    
                    <div className="p-3 bg-white rounded border border-blue-200">
                      <p className="font-medium text-blue-800 mb-2">📋 Copy the DeployHub Policy:</p>
                      <div className="bg-gray-50 p-2 rounded text-xs font-mono mb-2">
                        {JSON.stringify(awsPolicy, null, 2)}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(awsPolicy)}
                        className="w-full"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy DeployHub Policy
                      </Button>
                    </div>

                    {/* Security Information */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                      <h5 className="font-medium text-amber-800 mb-2">🔒 Security Features of This Policy:</h5>
                      <ul className="text-xs text-amber-700 space-y-1 ml-4">
                        <li>• <strong>Project-scoped:</strong> S3 buckets are limited to <code>deployhub-*</code> prefix</li>
                        <li>• <strong>Resource-level permissions:</strong> Only specific actions allowed, not wildcard access</li>
                        <li>• <strong>Stack isolation:</strong> CloudFormation stacks limited to <code>deployhub-*</code> prefix</li>
                        <li>• <strong>Log isolation:</strong> CloudWatch logs limited to <code>/aws/deployhub/*</code> path</li>
                        <li>• <strong>Role scoping:</strong> IAM roles limited to <code>deployhub-*</code> prefix</li>
                        <li>• <strong>No admin access:</strong> Cannot create/delete users, modify billing, or access other AWS services</li>
                      </ul>
                    </div>

                    <div className="p-3 bg-white rounded border border-green-200">
                      <p className="font-medium text-green-800 mb-2">✅ Now create the policy in AWS:</p>
                      <ol className="text-sm space-y-1 ml-4">
                        <li>1. Click the button below to open AWS IAM Policies</li>
                        <li>2. Click "Create policy"</li>
                        <li>3. Switch to the JSON tab</li>
                        <li>4. Paste the copied policy above</li>
                        <li>5. Name it "DeployHubPolicy"</li>
                        <li>6. Click "Create policy"</li>
                        <li>7. Come back here when done!</li>
                      </ol>
                      <div className="mt-3">
                        <Button variant="default" size="sm" asChild>
                          <a href="https://console.aws.amazon.com/iam/home#/policies" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open AWS IAM Policies
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <h4 className="font-medium mb-2 text-blue-800">📋 Step 2: Create the IAM Role</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Now that you have the policy, let's create the role and attach it.
                    </p>
                    
                    <div className="flex items-center justify-between p-4 bg-white rounded border">
                    <div>
                        <h5 className="font-medium">Open AWS IAM Roles</h5>
                        <p className="text-sm text-muted-foreground">Navigate to the IAM Roles section</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://console.aws.amazon.com/iam/home#/roles" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                          Open IAM Roles
                      </a>
                    </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Step 2a: Select trusted entity</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4">
                      <li>1. Click "Create role"</li>
                      <li>2. Select "AWS account" as trusted entity type</li>
                      <li>3. Choose "Another AWS account"</li>
                      <li>4. Enter Account ID: <code className="bg-muted px-1 rounded">YOUR_ACCOUNT_ID</code></li>
                      <li>5. Check "Require external ID (Best practice when a third party will assume this role)"</li>
                      <li>6. Enter External ID: <code className="bg-muted px-1 rounded">{externalId}</code></li>
                      <li>7. Click "Next"</li>
                    </ol>
                    
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                      <p className="font-medium text-blue-900 mb-1">💡 How to find your Account ID:</p>
                      <ol className="text-blue-700 space-y-1 ml-4">
                        <li>• Go to <a href="https://console.aws.amazon.com/billing/home#/account" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">AWS Billing Console</a></li>
                        <li>• Look for "Account ID" in the top right</li>
                        <li>• Or check the URL when logged into AWS Console</li>
                      </ol>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <h4 className="font-medium mb-2 text-green-800">Step 2b: Add permissions</h4>
                    <div className="text-sm text-green-700 space-y-2">
                      <p className="font-medium">Now you can easily select the DeployHubPolicy you just created:</p>
                      <ol className="space-y-1 ml-4">
                        <li>1. In the search box, type "DeployHubPolicy"</li>
                        <li>2. Check the box next to "DeployHubPolicy"</li>
                        <li>3. Click "Next" to continue</li>
                      </ol>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Step 2c: Name, review, and create</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4">
                      <li>1. Give your role a name: <code className="bg-muted px-1 rounded">DeployHubRole</code></li>
                      <li>2. Add description: <code className="bg-muted px-1 rounded">Role for DeployHub deployments</code></li>
                      <li>3. Review the trusted entity and permissions</li>
                      <li>4. Click "Next" to continue</li>
                    </ol>
                  </div>

                  <div className="p-4 border rounded-lg bg-gray-50 border-gray-200">
                    <h4 className="font-medium mb-2 text-gray-800">Step 2d: Add tags (Optional)</h4>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p className="font-medium">AWS will show you the "Add tags" section. This is optional but recommended:</p>
                      <div className="ml-4 space-y-2">
                        <div className="p-2 bg-white rounded border">
                          <p className="font-medium text-green-700">Recommended tags:</p>
                          <ul className="mt-1 space-y-1 text-xs">
                            <li>• <strong>Key:</strong> <code className="bg-muted px-1 rounded">Project</code> <strong>Value:</strong> <code className="bg-muted px-1 rounded">DeployHub</code></li>
                            <li>• <strong>Key:</strong> <code className="bg-muted px-1 rounded">Environment</code> <strong>Value:</strong> <code className="bg-muted px-1 rounded">Production</code></li>
                            <li>• <strong>Key:</strong> <code className="bg-muted px-1 rounded">Purpose</code> <strong>Value:</strong> <code className="bg-muted px-1 rounded">Deployment Automation</code></li>
                          </ul>
                        </div>
                        <div className="p-2 bg-white rounded border">
                          <p className="font-medium text-blue-700">Or skip tags:</p>
                          <p className="text-xs">You can add tags later from the role details page if needed.</p>
                        </div>
                      </div>
                      <p className="font-medium mt-2">Click "Next" to continue to the final review.</p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <h4 className="font-medium mb-2 text-green-800">Final: Review & Create</h4>
                    <ol className="text-sm text-green-700 space-y-2 ml-4">
                      <li>1. Review all the settings shown above:</li>
                      <ul className="ml-4 mt-1 space-y-1 text-xs">
                        <li>• Trusted entity: Your account ID + External ID</li>
                        <li>• Permissions: DeployHubPolicy attached</li>
                        <li>• Role name: DeployHubRole</li>
                        <li>• Description: Role for DeployHub deployments</li>
                      </ul>
                      <li>2. Click "Create role"</li>
                      <li>3. Copy the Role ARN for Step 4 in DeployHub</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Configure Policy */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <h4 className="font-medium mb-2 text-blue-900">🎯 What You've Accomplished</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      In Step 2, you created the DeployHubPolicy and attached it to your role. 
                      Now let's verify everything is set up correctly.
                    </p>
                    <div className="bg-white p-3 rounded border">
                      <h5 className="font-medium text-green-700 mb-2">✅ Policy Created & Attached</h5>
                      <p className="text-sm text-green-700">
                        Your DeployHubPolicy should now be attached to your DeployHubRole in AWS.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Trust Policy (For Reference)</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      This is the trust policy that was automatically configured when you created the role. 
                      You don't need to do anything with this - it's just for your reference.
                    </p>
                    <div className="bg-muted p-3 rounded text-xs font-mono mb-3">
                      {JSON.stringify(trustPolicy, null, 2)}
                    </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                      onClick={() => copyToClipboard(trustPolicy)}
                      className="w-full"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                      Copy Trust Policy
                      </Button>
                  </div>

                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <h4 className="font-medium mb-2 text-green-800">🚀 Ready for the Next Step!</h4>
                    <p className="text-sm text-green-700 mb-3">
                      Your AWS IAM role is now properly configured with the DeployHubPolicy. 
                      The next step is to copy the Role ARN and complete the connection.
                    </p>
                    <div className="bg-white p-3 rounded border">
                      <h5 className="font-medium text-blue-700 mb-2">📋 What to do next:</h5>
                      <ol className="text-sm text-blue-700 space-y-1 ml-4">
                        <li>1. Go back to your AWS IAM role creation</li>
                        <li>2. Complete the role creation process</li>
                        <li>3. Copy the Role ARN from the role details page</li>
                        <li>4. Paste it in Step 4 of DeployHub</li>
                    </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Enter ARN */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="roleArn">Role ARN</Label>
                    <Input
                      id="roleArn"
                      placeholder="arn:aws:iam::123456789012:role/DeployHubRole"
                      value={roleArn}
                      onChange={(e) => setRoleArn(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Copy the ARN from your newly created role in the AWS console. 
                      It should look like: <code className="bg-muted px-1 rounded">arn:aws:iam::YOUR_ACCOUNT_ID:role/DeployHubRole</code>
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-green-900 mb-1">Almost done!</p>
                        <p className="text-green-700">Once you submit this ARN, you'll be ready to deploy applications.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={prevStep} 
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < steps.length ? (
                <Button onClick={nextStep}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={validateAndSubmit}
                  disabled={!roleArn.trim() || isConnecting}
                  className="bg-gradient-primary"
                >
                  {isConnecting ? (
                    <>Connecting...</>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}