import { useState } from "react";
import { Button } from "@/components/ui/button";
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
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "lambda:*", 
        "cloudformation:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
};

const trustPolicy = {
  "Version": "2012-10-17", 
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "deployhub-user-12345"
        }
      }
    }
  ]
};

export default function AWSSetup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [roleArn, setRoleArn] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const copyToClipboard = (text: string | object) => {
    const textToCopy = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Copied to clipboard",
      description: "The configuration has been copied to your clipboard.",
    });
  };

  const validateAndSubmit = async () => {
    setIsValidating(true);
    
    // Simulate validation
    setTimeout(() => {
      setIsValidating(false);
      toast({
        title: "AWS Account Connected!",
        description: "Your account is ready for deployments.",
      });
      navigate("/dashboard");
    }, 2000);
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
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">1. Open AWS IAM Console</h4>
                      <p className="text-sm text-muted-foreground">Navigate to the Identity and Access Management service</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://console.aws.amazon.com/iam/home#/roles" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open IAM
                      </a>
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">2. Create a new role</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4">
                      <li>1. Click "Create role"</li>
                      <li>2. Select "AWS account" as trusted entity type</li>
                      <li>3. Choose "Another AWS account"</li>
                      <li>4. Enter Account ID: <code className="bg-muted px-1 rounded">123456789012</code></li>
                      <li>5. Check "Require external ID"</li>
                      <li>6. Enter External ID: <code className="bg-muted px-1 rounded">deployhub-user-12345</code></li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Configure Policy */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">DeployHub Policy</h4>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(awsPolicy)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Policy
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(awsPolicy, null, 2)}
                    </pre>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Instructions</h4>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-4">
                      <li>1. In the AWS console, click "Create policy"</li>
                      <li>2. Switch to the JSON tab</li>
                      <li>3. Paste the policy above</li>
                      <li>4. Name it "DeployHubPolicy"</li>
                      <li>5. Create the policy</li>
                      <li>6. Go back to your role and attach this policy</li>
                    </ol>
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
                      Copy the ARN from your newly created role in the AWS console
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
                  disabled={!roleArn.trim() || isValidating}
                  className="bg-gradient-primary"
                >
                  {isValidating ? (
                    <>Validating...</>
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