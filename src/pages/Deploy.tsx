import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/contexts/ProjectContext";
import { useAWS } from "@/contexts/AWSContext";
import { useAWSStatus } from "@/hooks/use-aws-status";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/loading-spinner";
import { 
  Upload, 
  FileText, 
  Globe, 
  Rocket, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Cloud,
  RefreshCw,
  ExternalLink,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import ScalingManagement from "@/components/scaling-management";
import PrefectManagement from "@/components/prefect-management";

type DeploymentStep = 'upload' | 'configure' | 'scaling' | 'deploy' | 'success';

interface ProjectConfig {
  name: string;
  description: string;
  domain: string;
  files: File[];
}

interface FormErrors {
  name?: string;
  domain?: string;
  files?: string;
}

export default function Deploy() {
  const [currentStep, setCurrentStep] = useState<DeploymentStep>('upload');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [deploymentStep, setDeploymentStep] = useState('');
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isValidating, setIsValidating] = useState(false);
  const [deploymentMethod, setDeploymentMethod] = useState<'terraform' | 's3' | 'cloudformation'>('terraform');
  const { toast } = useToast();
  const { addProject } = useProjects();
  const { connection, credentials, deployToS3, deployWithCloudFormation, deployWithTerraform } = useAWS();
  const { hasAWSConnection, isLoading: isAWSLoading } = useAWSStatus();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    name: '',
    description: '',
    domain: '',
    files: []
  });
  const [deployedUrl, setDeployedUrl] = useState<string>('');

  const addDeploymentLog = (message: string) => {
    setDeploymentLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startRealDeployment = async () => {
    if (isDeploying) {
      console.log('Deployment already in progress, ignoring duplicate call');
      return;
    }

    // Reset any previous deployment state
    setDeploymentResult(null);
    setDeployedUrl('');
    setCurrentStep('deploy');
    
    setIsValidating(true);
    
    // Validate AWS connection and credentials
    if (!connection || !credentials) {
      setIsValidating(false);
      toast({
        title: "AWS Connection Issue",
        description: "AWS connection or credentials are missing. Please reconnect your AWS account.",
        variant: "destructive"
      });
      return;
    }
    
    // Check AWS connection using the same logic as the page guard
    if (isAWSLoading || !hasAWSConnection) {
      setIsValidating(false);
      toast({
        title: "AWS Connection Required",
        description: "Please connect your AWS account before deploying",
        variant: "destructive"
      });
      return;
    }
    
    // Validate configuration
    if (!validateConfiguration()) {
      setIsValidating(false);
      toast({
        title: "Validation failed",
        description: "Please fix the errors before deploying",
        variant: "destructive"
      });
      return;
    }
    
    setIsValidating(false);
    setIsDeploying(true);
    setCurrentStep('deploy');
    setDeploymentProgress(0);
    setDeploymentStep('Starting deployment...');
    setDeploymentLogs([]);
    addDeploymentLog('Starting deployment process...');
    
    try {
      // Step 1: Validate files
      setDeploymentProgress(10);
      setDeploymentStep('Validating files...');
      addDeploymentLog('Validating uploaded files...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Prepare AWS deployment
      setDeploymentProgress(25);
      setDeploymentStep('Preparing AWS deployment...');
      addDeploymentLog('Preparing AWS infrastructure...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Deploy to S3
      setDeploymentProgress(50);
      setDeploymentStep('Deploying to S3...');
      addDeploymentLog(`Starting ${deploymentMethod.toUpperCase()} deployment...`);
      
      let deploymentResult;
      switch (deploymentMethod) {
        case 'terraform':
          deploymentResult = await deployWithTerraform(
            projectConfig.name,
            projectConfig.files,
            projectConfig.domain
          );
          break;
        case 'cloudformation':
          deploymentResult = await deployWithCloudFormation(
            projectConfig.name,
            projectConfig.files,
            projectConfig.domain
          );
          break;
        case 's3':
        default:
          deploymentResult = await deployToS3(
            projectConfig.name,
            projectConfig.files,
            projectConfig.domain
          );
          break;
      }
      addDeploymentLog(`${deploymentMethod.toUpperCase()} deployment completed successfully`);

      // Step 4: Configure CloudFront
      setDeploymentProgress(75);
      setDeploymentStep('Configuring CloudFront...');
      addDeploymentLog('Setting up CloudFront distribution...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 5: Finalize deployment
      setDeploymentProgress(90);
      setDeploymentStep('Finalizing deployment...');
      addDeploymentLog('Finalizing deployment configuration...');
      await new Promise(resolve => setTimeout(resolve, 500));

      setDeploymentProgress(100);
      setDeploymentStep('Deployment completed!');
      addDeploymentLog('Deployment completed successfully!');

      // Add the project to the database
      const newProject = await addProject({
        name: projectConfig.name,
        domain: deploymentResult.url || projectConfig.domain,
        status: "deployed",
        framework: "Static Site",
        branch: "main",
        buildTime: "Real AWS deployment",
        size: `${Math.round(projectConfig.files.reduce((total, file) => total + file.size, 0) / (1024 * 1024) * 10) / 10} MB`,
        awsBucket: deploymentResult.bucketName,
        awsDistributionId: deploymentResult.distributionId,
        awsRegion: connection?.region || 'us-east-1'
      });

      if (!newProject) {
        throw new Error("Failed to save project to database");
      }

      setDeployedUrl(deploymentResult.url || projectConfig.domain);
      setDeploymentResult(deploymentResult);
      setCurrentStep('success');
      
      const methodNames = {
        terraform: 'Terraform',
        cloudformation: 'CloudFormation',
        s3: 'S3'
      };
      
      toast({
        title: "Deployment successful!",
        description: `Your application is now live on AWS using ${methodNames[deploymentMethod]}!`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
      console.error('Deployment error:', error);
      setDeploymentStep('Deployment failed');
      addDeploymentLog(`Error: ${errorMessage}`);
      setCurrentStep('configure');
      toast({
        title: "Deployment failed",
        description: errorMessage || "An error occurred during deployment",
        variant: "destructive"
      });
    } finally {
      setIsDeploying(false);
    }
  };

  // Show AWS setup prompt if user doesn't have AWS connection
  if (!isAWSLoading && hasAWSConnection === false) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <Globe className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>Connect Your AWS Account</CardTitle>
              <CardDescription>
                To deploy projects, you need to connect your AWS account first.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                We'll guide you through the AWS setup process step by step.
              </p>
              <div className="flex gap-2 justify-center">
                <Link to="/setup/aws">
                  <Button>
                    <Globe className="h-4 w-4 mr-2" />
                    Connect AWS Account
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Don't render deploy page if still checking AWS status
  if (isAWSLoading) {
    return null;
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      const validationError = validateFiles(files);
      
      if (validationError) {
        setErrors(prev => ({ ...prev, files: validationError }));
        toast({
          title: "Invalid files",
          description: validationError,
          variant: "destructive"
        });
        return;
      }
      
      setErrors(prev => ({ ...prev, files: undefined }));
      setProjectConfig(prev => ({ ...prev, files }));
      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) ready for deployment`,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validationError = validateFiles(files);
      
      if (validationError) {
        setErrors(prev => ({ ...prev, files: validationError }));
        toast({
          title: "Invalid files",
          description: validationError,
          variant: "destructive"
        });
        return;
      }
      
      setErrors(prev => ({ ...prev, files: undefined }));
      setProjectConfig(prev => ({ ...prev, files }));
      toast({
        title: "Files selected",
        description: `${files.length} file(s) ready for deployment`,
      });
    }
  };

  const validateFiles = (files: File[]): string | null => {
    const maxFileSize = 50 * 1024 * 1024; // 50MB (increased for project files)
    const allowedTypes = [
      'text/html', 'text/css', 'application/javascript', 'text/javascript',
      'application/json', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml',
      'application/zip', 'text/plain', 'text/typescript', 'text/jsx', 'text/tsx',
      'application/x-tar', 'application/gzip'
    ];

    // Extended file extensions for various project types
    const allowedExtensions = [
      'html', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'zip', 'txt',
      'md', 'yml', 'yaml', 'toml', 'xml', 'scss', 'sass', 'less', 'styl', 'vue', 'svelte',
      'py', 'rb', 'php', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'swift', 'kt',
      'sh', 'bash', 'ps1', 'bat', 'cmd', 'dockerfile', 'dockerignore', 'gitignore',
      'env', 'env.local', 'env.production', 'env.development', 'config', 'conf'
    ];

    for (const file of files) {
      if (file.size > maxFileSize) {
        return `File "${file.name}" is too large. Maximum size is 50MB.`;
      }
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const isValidType = allowedTypes.includes(file.type) || 
                         (fileExtension && allowedExtensions.includes(fileExtension));
      
      if (!isValidType) {
        return `File "${file.name}" has an unsupported file type. Supported: ${allowedExtensions.slice(0, 10).join(', ')}...`;
      }
    }

    return null;
  };

  const validateProjectName = (name: string): string | null => {
    if (!name.trim()) {
      return "Project name is required";
    }
    if (name.length < 3) {
      return "Project name must be at least 3 characters";
    }
    if (name.length > 50) {
      return "Project name must be less than 50 characters";
    }
    if (!/^[a-zA-Z0-9\s-_]+$/.test(name)) {
      return "Project name can only contain letters, numbers, spaces, hyphens, and underscores";
    }
    return null;
  };

  const validateDomain = (domain: string): string | null => {
    if (!domain.trim()) return null; // Domain is optional
    
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return "Please enter a valid domain (e.g., www.example.com)";
    }
    return null;
  };

  const validateConfiguration = (): boolean => {
    const newErrors: FormErrors = {};
    
    const nameError = validateProjectName(projectConfig.name);
    if (nameError) newErrors.name = nameError;
    
    const domainError = validateDomain(projectConfig.domain);
    if (domainError) newErrors.domain = domainError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const renderUploadStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Your Application
        </CardTitle>
        <CardDescription>
          Upload your project files - we support React, Vue, Angular, Next.js, and more! Upload as ZIP or individual files.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Drop your files here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports React, Vue, Angular, Next.js, Svelte, and static sites. Upload as ZIP or individual files.
            </p>
          </div>
          <input
            type="file"
            multiple
            accept=".zip,.html,.css,.js,.jsx,.ts,.tsx,.json,.png,.jpg,.jpeg,.gif,.svg,.vue,.svelte,.md,.yml,.yaml,.toml,.xml,.scss,.sass,.less,.styl,.py,.rb,.php,.go,.rs,.java,.c,.cpp,.h,.hpp,.cs,.swift,.kt,.sh,.bash,.ps1,.bat,.cmd,.dockerfile,.gitignore,.env"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <Label htmlFor="file-upload" className="cursor-pointer">
            <Button variant="outline" className="mt-4" asChild>
              <span>Browse Files</span>
            </Button>
          </Label>
        </div>

        {errors.files && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.files}</AlertDescription>
          </Alert>
        )}

        {projectConfig.files.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files ({projectConfig.files.length})</Label>
            <div className="max-h-32 overflow-y-auto space-y-1 p-2 border rounded">
              {projectConfig.files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{file.name}</span>
                  <span className="text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button 
            onClick={() => setCurrentStep('configure')}
            disabled={projectConfig.files.length === 0}
            className="min-w-32"
          >
            Next Step
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderConfigureStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Configure Your Deployment
        </CardTitle>
        <CardDescription>
          Set up your project details and custom domain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="project-name">Project Name *</Label>
          <Input
            id="project-name"
            placeholder="My Awesome Website"
            value={projectConfig.name}
            onChange={(e) => {
              setProjectConfig(prev => ({ ...prev, name: e.target.value }));
              if (errors.name) {
                const nameError = validateProjectName(e.target.value);
                setErrors(prev => ({ ...prev, name: nameError || undefined }));
              }
            }}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-description">Description (Optional)</Label>
          <Textarea
            id="project-description"
            placeholder="A brief description of your project..."
            value={projectConfig.description}
            onChange={(e) => setProjectConfig(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-domain">Custom Domain (Optional)</Label>
          <Input
            id="custom-domain"
            placeholder="www.mywebsite.com"
            value={projectConfig.domain}
            onChange={(e) => {
              setProjectConfig(prev => ({ ...prev, domain: e.target.value }));
              if (errors.domain) {
                const domainError = validateDomain(e.target.value);
                setErrors(prev => ({ ...prev, domain: domainError || undefined }));
              }
            }}
            className={errors.domain ? "border-destructive" : ""}
          />
          {errors.domain && (
            <p className="text-sm text-destructive">{errors.domain}</p>
          )}
          <p className="text-xs text-muted-foreground">
            You'll receive instructions on how to configure your DNS settings after deployment
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deployment-method">Deployment Method</Label>
          <Select 
            value={deploymentMethod} 
            onValueChange={(value: 'terraform' | 's3' | 'cloudformation') => setDeploymentMethod(value)}
          >
            <SelectTrigger id="deployment-method">
              <SelectValue placeholder="Select deployment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="terraform">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span>Terraform (Recommended)</span>
                </div>
              </SelectItem>
              <SelectItem value="s3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>S3 Only</span>
                </div>
              </SelectItem>
              <SelectItem value="cloudformation">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>CloudFormation</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Terraform provides the most secure and scalable infrastructure with CloudFront CDN
          </p>
        </div>

        {(() => {
          const htmlFiles = projectConfig.files.filter(f => f.name.toLowerCase().endsWith('.html'));
          const hasIndexHtml = htmlFiles.some(f => f.name.toLowerCase() === 'index.html');
          const otherHtmlFiles = htmlFiles.filter(f => f.name.toLowerCase() !== 'index.html');
          const hasPackageJson = projectConfig.files.some(f => f.name === 'package.json');
          const hasStaticFiles = projectConfig.files.some(f => 
            f.name.toLowerCase().endsWith('.html') || 
            f.name.toLowerCase().endsWith('.css') || 
            f.name.toLowerCase().endsWith('.js')
          );
          
          // For framework projects (React, Vue, etc.) - HTML is generated during build
          if (hasPackageJson) {
            return (
              <Alert className="border-blue-200 bg-blue-50">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  ✅ Framework project detected - DeployHub will build and deploy your application automatically!
                </AlertDescription>
              </Alert>
            );
          }
          
          // For static sites - check for HTML files
          if (hasStaticFiles) {
            if (hasIndexHtml) {
              return (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ✅ Found <code className="bg-green-100 px-1 rounded">index.html</code> - your static site is ready to deploy!
                  </AlertDescription>
                </Alert>
              );
            } else if (otherHtmlFiles.length > 0) {
              return (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <div className="space-y-2">
                      <p>Found HTML files but no <code className="bg-amber-100 px-1 rounded">index.html</code>:</p>
                      <div className="space-y-1">
                        {otherHtmlFiles.map(file => (
                          <div key={file.name} className="flex items-center gap-2 text-sm">
                            <code className="bg-amber-100 px-1 rounded">{file.name}</code>
                            <span className="text-amber-700">will be renamed to index.html</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-amber-700">
                        DeployHub will automatically use your first HTML file as the entry point.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            }
          }
          
          // No recognizable project files
          return (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <div className="space-y-2">
                  <p>No recognizable project files found.</p>
                  <div className="text-sm space-y-1">
                    <p>DeployHub supports:</p>
                    <ul className="ml-4 space-y-1 text-xs">
                      <li>• <strong>Framework projects:</strong> React, Vue, Angular, Next.js, etc. (with package.json)</li>
                      <li>• <strong>Static sites:</strong> HTML, CSS, JS files</li>
                      <li>• <strong>Backend projects:</strong> Node.js, Python, etc.</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          );
        })()}

        {connection && !connection.is_active && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AWS connection required for deployment. <Link to="/setup/aws" className="underline">Connect your AWS account</Link> before proceeding.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('upload')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={() => setCurrentStep('scaling')}
            disabled={!projectConfig.name.trim()}
            className="bg-gradient-primary hover:shadow-glow min-w-32"
          >
            Next Step
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderScalingStep = () => (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Configure Scaling & Workflows
          </CardTitle>
          <CardDescription>
            Set up auto-scaling policies and Prefect workflows for your deployment (Optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This step is optional. You can skip it and configure scaling later from your dashboard.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Auto-Scaling Configuration</h3>
              <ScalingManagement projectId={projectConfig.name} />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Workflow Management</h3>
              <PrefectManagement />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep('configure')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('deploy')}
          >
            Skip Scaling
          </Button>
          <Button 
            onClick={startRealDeployment}
            disabled={!projectConfig.name.trim() || isValidating || !connection || !connection.is_active}
            className="bg-gradient-primary hover:shadow-glow min-w-32"
          >
            {isValidating ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Rocket className="h-4 w-4 mr-2" />
            )}
            {isValidating ? "Validating..." : "Deploy Now"}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderDeployStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Rocket className="h-5 w-5" />
          Deploying Your Application
        </CardTitle>
        <CardDescription>
          Please wait while we deploy your application to the cloud
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Clean Deployment Progress Display */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Deployment Progress</span>
            <span>{Math.round(deploymentProgress)}%</span>
          </div>
          <Progress value={deploymentProgress} className="h-2" />
        </div>

        <div className="space-y-3">
          {[
            { text: "Validating your application files...", threshold: 10 },
            { text: "Creating S3 bucket and configuring...", threshold: 30 },
            { text: "Uploading files to AWS S3...", threshold: 60 }, 
            { text: "Configuring static website hosting...", threshold: 80 },
            { text: "Setting up public access...", threshold: 95 },
            { text: "Finalizing deployment...", threshold: 100 }
          ].map((step, index) => {
            const isCompleted = deploymentProgress >= step.threshold;
            const isCurrent = deploymentProgress < step.threshold && (index === 0 || deploymentProgress >= (index > 0 ? [10, 30, 60, 80, 95][index - 1] : 0));
            
            return (
              <div key={index} className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : isCurrent ? (
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted" />
                )}
                <span className={`text-sm ${isCompleted ? 'text-success' : isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current Status Message */}
        {deploymentStep && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-center">
            <p className="text-sm font-medium">{deploymentStep}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-success/10 p-3">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
        </div>
        <CardTitle>Deployment Successful! 🎉</CardTitle>
        <CardDescription>
          Your application is now live and accessible on the web
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-sm font-medium">Project Name</Label>
            <p className="text-sm text-muted-foreground">{projectConfig.name}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Live URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm bg-background px-2 py-1 rounded border flex-1">
                {deployedUrl || `https://${projectConfig.name.toLowerCase().replace(/\s+/g, '-')}.deployhub.app`}
              </code>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(deployedUrl || `https://${projectConfig.name.toLowerCase().replace(/\s+/g, '-')}.deployhub.app`);
                  toast({ title: "URL copied to clipboard!" });
                }}
              >
                Copy
              </Button>
            </div>
          </div>
          {projectConfig.domain && (
            <div>
              <Label className="text-sm font-medium">Custom Domain Setup</Label>
              <p className="text-sm text-muted-foreground mt-1">
                To use your custom domain ({projectConfig.domain}), please update your DNS settings.
                Check your email for detailed instructions.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button className="w-full" asChild>
            <a href={deployedUrl || `https://${projectConfig.name.toLowerCase().replace(/\s+/g, '-')}.deployhub.app`} target="_blank" rel="noopener noreferrer">
              View Live Site
            </a>
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/dashboard">
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => {
              setCurrentStep('upload');
              setProjectConfig({ name: '', description: '', domain: '', files: [] });
              setDeploymentProgress(0);
              setDeployedUrl('');
            }}>
              Deploy Another
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const getStepNumber = () => {
    switch (currentStep) {
      case 'upload': return 1;
      case 'configure': return 2;
      case 'scaling': return 3;
      case 'deploy': return 4;
      case 'success': return 5;
      default: return 1;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Deploy Your Application</h1>
          <p className="text-muted-foreground">
            Follow the simple steps below to get your app live on the web
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[
              { step: 1, label: 'Upload', key: 'upload' },
              { step: 2, label: 'Configure', key: 'configure' },
              { step: 3, label: 'Scaling', key: 'scaling' },
              { step: 4, label: 'Deploy', key: 'deploy' },
              { step: 5, label: 'Success', key: 'success' }
            ].map(({ step, label, key }) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  getStepNumber() >= step 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {getStepNumber() > step ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step
                  )}
                </div>
                <span className={`ml-2 text-sm ${
                  getStepNumber() >= step ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {label}
                </span>
                {step < 5 && (
                  <div className={`ml-4 w-8 h-px ${
                    getStepNumber() > step ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex justify-center">
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'configure' && renderConfigureStep()}
          {currentStep === 'scaling' && renderScalingStep()}
          {currentStep === 'deploy' && renderDeployStep()}
          {currentStep === 'success' && renderSuccessStep()}
        </div>
        {/* Deployment Results Display */}
        {deploymentResult && !isDeploying && (
          <div className="mt-6">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  Deployment Successful!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-green-700">Project Name</div>
                    <div className="text-sm text-green-600">{deploymentResult.projectName || projectConfig?.name}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-green-700">Deployment Method</div>
                    <div className="text-sm text-green-600 capitalize">{deploymentMethod}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-green-700">S3 Bucket</div>
                    <div className="text-sm text-green-600 font-mono">{deploymentResult.bucketName}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-green-700">CloudFront Distribution</div>
                    <div className="text-sm text-green-600 font-mono">{deploymentResult.distributionId}</div>
                  </div>
                </div>
                
                {deploymentResult.url && (
                  <div className="pt-4 border-t border-green-200">
                    <div className="text-sm font-medium text-green-700 mb-2">Your Application is Live!</div>
                    <a 
                      href={deploymentResult.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-green-600 hover:text-green-800 underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {deploymentResult.url}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}