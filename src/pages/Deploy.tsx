import { useState, useEffect, useMemo, useCallback } from "react";
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
  Activity,
  Archive,
  Settings,
  Clock
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
  // ALL STATE HOOKS
  const [currentStep, setCurrentStep] = useState<DeploymentStep>('upload');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [deploymentStep, setDeploymentStep] = useState('');
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isConfigurationValid, setIsConfigurationValid] = useState(false);
  const [deploymentMethod, setDeploymentMethod] = useState<'terraform' | 's3' | 'cloudformation'>('terraform');
  const [isExtracting, setIsExtracting] = useState(false);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    name: '',
    description: '',
    domain: '',
    files: []
  });
  const [deployedUrl, setDeployedUrl] = useState<string>('');

  // ALL CONTEXT HOOKS
  const { toast } = useToast();
  const { addProject } = useProjects();
  const { connection, credentials, deployToS3, deployWithCloudFormation, deployWithTerraform } = useAWS();
  const { hasAWSConnection, isLoading: isAWSLoading } = useAWSStatus();
  const { user } = useAuth();
  const navigate = useNavigate();

  // MEMOIZED VALUES
  const projectDetection = useMemo(() => {
    const htmlFiles = projectConfig.files.filter(f => f.name.toLowerCase().endsWith('.html'));
    const hasIndexHtml = htmlFiles.some(f => f.name.toLowerCase() === 'index.html');
    const otherHtmlFiles = htmlFiles.filter(f => f.name.toLowerCase() !== 'index.html');
    const hasPackageJson = projectConfig.files.some(f => f.name === 'package.json');
    const hasStaticFiles = projectConfig.files.some(f => 
      f.name.toLowerCase().endsWith('.html') || 
      f.name.toLowerCase().endsWith('.css') || 
      f.name.toLowerCase().endsWith('.js') ||
      f.name.toLowerCase().endsWith('.png') ||
      f.name.toLowerCase().endsWith('.jpg') ||
      f.name.toLowerCase().endsWith('.jpeg') ||
      f.name.toLowerCase().endsWith('.gif') ||
      f.name.toLowerCase().endsWith('.svg')
    );
    
    return {
      htmlFiles,
      hasIndexHtml,
      otherHtmlFiles,
      hasPackageJson,
      hasStaticFiles
    };
  }, [projectConfig.files]);

  const projectDetectionAlert = useMemo(() => {
    const { hasIndexHtml, otherHtmlFiles, hasPackageJson, hasStaticFiles } = projectDetection;
    
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
  }, [projectDetection]);

  // CALLBACK FUNCTIONS
  const addDeploymentLog = useCallback((message: string) => {
    setDeploymentLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  const getFileTypeFromExtension = useCallback((filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'xml': 'application/xml',
      'pdf': 'application/pdf'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }, []);

  const extractZipFile = useCallback(async (zipFile: File): Promise<File[]> => {
    try {
      setIsExtracting(true);
      
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipFile);
      const extractedFiles: File[] = [];

      for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
        if (zipEntry.dir || relativePath.startsWith('.')) {
          continue;
        }

        const pathDepth = relativePath.split('/').length;
        if (pathDepth > 10) {
          console.warn(`Skipping deeply nested file: ${relativePath}`);
          continue;
        }

        try {
          const content = await zipEntry.async('blob');
          const extractedFile = new File([content], relativePath, {
            type: getFileTypeFromExtension(relativePath),
            lastModified: zipEntry.date?.getTime() || Date.now()
          });
          extractedFiles.push(extractedFile);
        } catch (error) {
          console.warn(`Failed to extract file ${relativePath}:`, error);
        }
      }
      
      return extractedFiles;
    } catch (error) {
      console.error('Failed to extract ZIP file:', error);
      throw new Error('Failed to extract ZIP file. Please ensure it\'s a valid ZIP archive.');
    } finally {
      setIsExtracting(false);
    }
  }, [getFileTypeFromExtension]);

  const processUploadedFiles = useCallback(async (files: File[]): Promise<File[]> => {
    const processedFiles: File[] = [];
    
    for (const file of files) {
      if (file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')) {
        try {
          const extractedFiles = await extractZipFile(file);
          processedFiles.push(...extractedFiles);
          toast({
            title: "ZIP file extracted",
            description: `Extracted ${extractedFiles.length} files from ${file.name}`,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to extract ZIP file';
          toast({
            title: "ZIP extraction failed",
            description: errorMessage,
            variant: "destructive"
          });
          throw error;
        }
      } else {
        processedFiles.push(file);
      }
    }
    
    return processedFiles;
  }, [extractZipFile, toast]);

  const validateFiles = useCallback((files: File[]): string | null => {
    const maxFileSize = 50 * 1024 * 1024;
    const allowedTypes = [
      'text/html', 'text/css', 'application/javascript', 'text/javascript',
      'application/json', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml',
      'application/zip', 'text/plain', 'text/typescript', 'text/jsx', 'text/tsx',
      'application/x-tar', 'application/gzip'
    ];

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
  }, []);

  const validateProjectName = useCallback((name: string): string | null => {
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
  }, []);

  const validateDomain = useCallback((domain: string): string | null => {
    if (!domain.trim()) return null;
    
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return "Please enter a valid domain (e.g., www.example.com)";
    }
    return null;
  }, []);

  const validateConfiguration = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    
    const nameError = validateProjectName(projectConfig.name);
    if (nameError) newErrors.name = nameError;
    
    const domainError = validateDomain(projectConfig.domain);
    if (domainError) newErrors.domain = domainError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [projectConfig.name, projectConfig.domain, validateProjectName, validateDomain]);

  // Validate configuration when relevant fields change
  useEffect(() => {
    const isValid = validateConfiguration();
    setIsConfigurationValid(isValid);
  }, [projectConfig.name, projectConfig.domain, validateProjectName, validateDomain]);

  const handleStepNavigation = useCallback((step: DeploymentStep) => {
    setCurrentStep(step);
  }, []);

  // EVENT HANDLERS
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
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
      
      try {
        const processedFiles = await processUploadedFiles(files);
        setErrors(prev => ({ ...prev, files: undefined }));
        setProjectConfig(prev => ({ ...prev, files: processedFiles }));
        toast({
          title: "Files processed",
          description: `${processedFiles.length} file(s) ready for deployment`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process files';
        setErrors(prev => ({ ...prev, files: errorMessage }));
        toast({
          title: "File processing failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    }
  }, [validateFiles, processUploadedFiles, toast]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      try {
        const processedFiles = await processUploadedFiles(files);
        setErrors(prev => ({ ...prev, files: undefined }));
        setProjectConfig(prev => ({ ...prev, files: processedFiles }));
        toast({
          title: "Files processed",
          description: `${processedFiles.length} file(s) ready for deployment`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process files';
        setErrors(prev => ({ ...prev, files: errorMessage }));
        toast({
          title: "File processing failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    }
  }, [validateFiles, processUploadedFiles, toast]);

  const handleCancelDeployment = useCallback(() => {
    setIsDeploying(false);
    setDeploymentProgress(0);
    setDeploymentStep('');
    setDeploymentLogs([]);
    setDeploymentError(null);
    toast({
      title: "Deployment cancelled",
      description: "The deployment has been cancelled",
    });
  }, [toast]);

  const handleDeploy = useCallback(async () => {
    if (!projectConfig.name || projectConfig.files.length === 0) {
      toast({
        title: "Missing required information",
        description: "Please ensure you have uploaded files and entered a project name",
        variant: "destructive"
      });
      return;
    }

    setIsDeploying(true);
    setDeploymentProgress(0);
    setDeploymentStep('Initializing deployment...');
    setDeploymentLogs([]);
    setDeploymentResult(null);
    setDeploymentError(null);

    try {
      addDeploymentLog(`Starting ${deploymentMethod} deployment for project: ${projectConfig.name}`);
      setDeploymentProgress(10);

      let result;
      const domain = projectConfig.domain || undefined;

      switch (deploymentMethod) {
        case 's3':
          addDeploymentLog('Deploying to S3 with CloudFront...');
          setDeploymentStep('Deploying to S3...');
          setDeploymentProgress(30);
          result = await deployToS3(projectConfig.name, projectConfig.files, domain);
          break;
        case 'cloudformation':
          addDeploymentLog('Deploying with CloudFormation...');
          setDeploymentStep('Deploying with CloudFormation...');
          setDeploymentProgress(30);
          result = await deployWithCloudFormation(projectConfig.name, projectConfig.files, domain);
          break;
        case 'terraform':
          addDeploymentLog('Deploying with Terraform...');
          setDeploymentStep('Deploying with Terraform...');
          setDeploymentProgress(30);
          result = await deployWithTerraform(projectConfig.name, projectConfig.files, domain);
          break;
        default:
          throw new Error(`Unknown deployment method: ${deploymentMethod}`);
      }

      setDeploymentProgress(80);
      setDeploymentStep('Finalizing deployment...');

      if (result.success) {
        addDeploymentLog('Deployment completed successfully!');
        setDeploymentProgress(100);
        setDeploymentStep('Deployment completed!');
        
        if (result.url) {
          setDeployedUrl(result.url);
          addDeploymentLog(`Application URL: ${result.url}`);
        }
        
        if (result.logs) {
          result.logs.forEach(log => addDeploymentLog(log));
        }

        setDeploymentResult(result);
        
        // Add project to projects context
        if (addProject) {
          await addProject({
            name: projectConfig.name,
            domain: result.url || projectConfig.domain || '',
            status: 'deployed',
            framework: projectDetection.hasPackageJson ? 'Framework Project' : 'Static Site',
            branch: 'main',
            description: projectConfig.description,
            awsBucket: result.bucketName || undefined,
            awsDistributionId: result.distributionId || undefined,
            awsRegion: connection?.region || 'us-east-1'
          });
        }

        toast({
          title: "Deployment successful!",
          description: result.url ? `Your app is live at ${result.url}` : "Your app has been deployed successfully",
        });

        // Navigate to success step after a short delay
        setTimeout(() => {
          handleStepNavigation('success');
        }, 1000);
      } else {
        throw new Error(result.error || 'Deployment failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
      addDeploymentLog(`Deployment failed: ${errorMessage}`);
      setDeploymentStep('Deployment failed');
      setDeploymentError(errorMessage);
      
      toast({
        title: "Deployment failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsDeploying(false);
    }
  }, [
    projectConfig,
    deploymentMethod,
    deployToS3,
    deployWithCloudFormation,
    deployWithTerraform,
    addProject,
    addDeploymentLog,
    handleStepNavigation,
    toast
  ]);

  // EARLY RETURNS
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

  if (isAWSLoading) {
    return null;
  }

  // RENDER FUNCTIONS
  const renderUploadStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Your Application
        </CardTitle>
        <CardDescription>
          Upload your project files or ZIP archive - we support React, Vue, Angular, Next.js, and more! 
          ZIP files will be automatically extracted.
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
          {isExtracting ? (
            <div className="space-y-4">
              <LoadingSpinner />
              <div>
                <p className="text-lg font-medium">Extracting ZIP file...</p>
                <p className="text-sm text-muted-foreground">Please wait while we extract your files</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium">Drop your files here</p>
                <p className="text-sm text-muted-foreground">
                  Or click to browse files
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports: HTML, CSS, JS, React, Vue, Angular, Next.js, ZIP archives
                </p>
              </div>
            </div>
          )}
          
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isExtracting}
          />
        </div>

        {projectConfig.files.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Uploaded Files ({projectConfig.files.length})</h4>
            <div className="space-y-1">
              {projectConfig.files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center gap-2 text-sm bg-background p-2 rounded border">
                  {file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip') ? (
                    <Archive className="h-4 w-4 text-blue-500" />
                  ) : file.name.toLowerCase().endsWith('.html') ? (
                    <FileText className="h-4 w-4 text-green-500" />
                  ) : file.name.toLowerCase().endsWith('.css') ? (
                    <FileText className="h-4 w-4 text-blue-500" />
                  ) : file.name.toLowerCase().endsWith('.js') ? (
                    <FileText className="h-4 w-4 text-yellow-500" />
                  ) : file.name.toLowerCase().endsWith('.md') ? (
                    <FileText className="h-4 w-4 text-purple-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate font-mono text-xs" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {Math.round(file.size / 1024)}KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {errors.files && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.files}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button 
            onClick={() => handleStepNavigation('configure')}
            disabled={projectConfig.files.length === 0 || isExtracting}
          >
            Next: Configure
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
          <Settings className="h-5 w-5" />
          Configure Your Deployment
        </CardTitle>
        <CardDescription>
          Set up your project details and custom domain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name *</Label>
            <Input
              id="project-name"
              value={projectConfig.name}
              onChange={(e) => setProjectConfig(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Demo DeployHub app"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description (Optional)</Label>
            <Textarea
              id="project-description"
              value={projectConfig.description}
              onChange={(e) => setProjectConfig(prev => ({ ...prev, description: e.target.value }))}
              placeholder="A brief description of your project..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-domain">Custom Domain (Optional)</Label>
            <Input
              id="project-domain"
              value={projectConfig.domain}
              onChange={(e) => setProjectConfig(prev => ({ ...prev, domain: e.target.value }))}
              placeholder="www.mywebsite.com"
            />
            {errors.domain && (
              <p className="text-sm text-destructive">{errors.domain}</p>
            )}
            <p className="text-xs text-muted-foreground">
              You'll receive instructions on how to configure your DNS settings after deployment
            </p>
          </div>

          <div className="space-y-2">
            <Label>Deployment Method</Label>
            <Select value={deploymentMethod} onValueChange={(value: any) => setDeploymentMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="terraform">Terraform (Recommended)</SelectItem>
                <SelectItem value="cloudformation">CloudFormation</SelectItem>
                <SelectItem value="s3">S3 Static Hosting</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Terraform provides the most secure and scalable infrastructure with CloudFront CDN
            </p>
          </div>
        </div>

        {projectDetectionAlert}

        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => handleStepNavigation('upload')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Upload
          </Button>
          <Button 
            onClick={() => handleStepNavigation('scaling')}
            disabled={!isConfigurationValid}
          >
            Next: Scaling
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderScalingStep = () => {
    const getScalingConfig = () => {
      switch (deploymentMethod) {
        case 's3':
          return {
            title: 'Static Site Hosting',
            description: 'CloudFront CDN with global edge locations',
            scaling: 'Automatic global distribution',
            instances: 'N/A - CDN based',
            cost: 'Pay per request + data transfer',
            features: ['Global CDN', 'Automatic caching', 'DDoS protection', 'SSL/TLS']
          };
        case 'cloudformation':
          return {
            title: 'CloudFormation Stack',
            description: 'Infrastructure as Code with auto-scaling groups',
            scaling: 'Auto Scaling Groups (ASG)',
            instances: '1-10 instances',
            cost: 'EC2 + Load Balancer + Auto Scaling',
            features: ['Load balancing', 'Health checks', 'Rolling updates', 'CloudWatch monitoring']
          };
        case 'terraform':
          return {
            title: 'Terraform Infrastructure',
            description: 'Advanced infrastructure with comprehensive scaling',
            scaling: 'Multi-AZ Auto Scaling Groups',
            instances: '1-20 instances',
            cost: 'EC2 + ALB + CloudWatch + Route53',
            features: ['Multi-AZ deployment', 'Advanced monitoring', 'Custom scaling policies', 'Infrastructure versioning']
          };
        default:
          return {
            title: 'Default Configuration',
            description: 'Standard deployment configuration',
            scaling: 'Basic auto-scaling',
            instances: '1-10 instances',
            cost: 'Standard AWS pricing',
            features: ['Basic scaling', 'Health monitoring']
          };
      }
    };

    const config = getScalingConfig();

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Scaling Configuration
          </CardTitle>
          <CardDescription>
            {config.description} - {config.scaling}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-medium">Auto-scaling is optimized for your deployment method</p>
                  <p className="text-sm">
                    {deploymentMethod === 's3' 
                      ? 'Your static site will be distributed globally via CloudFront CDN with automatic caching and edge optimization.'
                      : 'Your application will automatically scale based on traffic and resource usage with health monitoring and load balancing.'
                    }
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Scaling Parameters</h4>
                
                {deploymentMethod === 's3' ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>CDN Distribution</Label>
                      <Input value="Global Edge Locations" disabled />
                      <p className="text-xs text-muted-foreground">
                        Content served from 400+ locations worldwide
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Cache TTL</Label>
                      <Input value="24 hours (default)" disabled />
                      <p className="text-xs text-muted-foreground">
                        Static content cached for optimal performance
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Minimum Instances</Label>
                      <Input value={deploymentMethod === 'terraform' ? '1' : '1'} disabled />
                      <p className="text-xs text-muted-foreground">
                        Always-running instances for availability
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Maximum Instances</Label>
                      <Input value={deploymentMethod === 'terraform' ? '20' : '10'} disabled />
                      <p className="text-xs text-muted-foreground">
                        Peak capacity during high traffic
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>CPU Threshold</Label>
                      <Input value="70%" disabled />
                      <p className="text-xs text-muted-foreground">
                        Scale up when CPU usage exceeds 70%
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Memory Threshold</Label>
                      <Input value="80%" disabled />
                      <p className="text-xs text-muted-foreground">
                        Scale up when memory usage exceeds 80%
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Features & Benefits</h4>
                <div className="space-y-2">
                  {config.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                
                <div className="pt-2 border-t">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Cost Model:</p>
                    <p className="text-xs text-muted-foreground">{config.cost}</p>
                  </div>
                </div>
              </div>
            </div>

            {deploymentMethod !== 's3' && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="space-y-1">
                    <p className="font-medium">Cost Optimization</p>
                    <p className="text-sm">
                      Instances will automatically scale down during low traffic periods to minimize costs. 
                      You can adjust these settings after deployment in the AWS console.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Alert className="border-blue-200 bg-blue-50">
              <Settings className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-1">
                  <p className="font-medium">Advanced Configuration</p>
                  <p className="text-sm">
                    After deployment, you can fine-tune scaling policies, set up custom CloudWatch alarms, 
                    and configure advanced auto-scaling rules in the AWS console.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => handleStepNavigation('configure')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Configure
            </Button>
            <Button 
              onClick={() => handleStepNavigation('deploy')}
            >
              Next: Deploy
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDeployStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Deploy Your Application
        </CardTitle>
        <CardDescription>
          Deploying your application to AWS infrastructure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isDeploying ? (
          <div className="space-y-4">
            <div className="text-center">
              <LoadingSpinner />
              <p className="mt-4 text-lg font-medium">Deploying your application...</p>
              <p className="text-sm text-muted-foreground">{deploymentStep}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{deploymentProgress}%</span>
              </div>
              <Progress value={deploymentProgress} className="w-full" />
            </div>

            {deploymentLogs.length > 0 && (
              <div className="space-y-2">
                <Label>Deployment Logs</Label>
                <div className="bg-muted p-4 rounded-lg max-h-40 overflow-y-auto">
                  {deploymentLogs.map((log, index) => (
                    <div key={index} className="text-xs font-mono text-muted-foreground">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={handleCancelDeployment}
                className="text-destructive hover:text-destructive"
              >
                Cancel Deployment
              </Button>
            </div>
          </div>
        ) : deploymentError ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-destructive/10 p-3">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <p className="mt-4 text-lg font-medium text-destructive">Deployment Failed</p>
              <p className="text-sm text-muted-foreground">{deploymentError}</p>
            </div>

            {deploymentLogs.length > 0 && (
              <div className="space-y-2">
                <Label>Error Logs</Label>
                <div className="bg-muted p-4 rounded-lg max-h-40 overflow-y-auto">
                  {deploymentLogs.map((log, index) => (
                    <div key={index} className="text-xs font-mono text-muted-foreground">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeploymentError(null);
                  setDeploymentLogs([]);
                }}
              >
                Clear Error
              </Button>
              <Button 
                onClick={handleDeploy}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Deployment
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Rocket className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-lg font-medium">Ready to Deploy</p>
                <p className="text-sm text-muted-foreground">
                  Your application is ready to be deployed to AWS
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Deployment Summary</h4>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Project Name:</span>
                  <span className="font-mono">{projectConfig.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deployment Method:</span>
                  <span className="font-mono capitalize">{deploymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Files:</span>
                  <span className="font-mono">{projectConfig.files.length} files</span>
                </div>
                {projectConfig.domain && (
                  <div className="flex justify-between">
                    <span>Custom Domain:</span>
                    <span className="font-mono">{projectConfig.domain}</span>
                  </div>
                )}
              </div>
            </div>

            <Button 
              onClick={handleDeploy}
              className="w-full"
              size="lg"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Deploy Now
            </Button>
          </div>
        )}

        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => handleStepNavigation('scaling')}
            disabled={isDeploying}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scaling
          </Button>
          {deploymentResult && (
            <Button 
              onClick={() => handleStepNavigation('success')}
            >
              View Results
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Deployment Successful!
        </CardTitle>
        <CardDescription>
          Your application has been successfully deployed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-medium text-green-800">Deployment Complete!</p>
            <p className="text-sm text-muted-foreground">
              Your application should be live and accessible within 15-20 min!
            </p>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="text-blue-600 mt-0.5">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-blue-800">CloudFront Propagation</p>
                  <p className="text-blue-700">
                    Your CloudFront URL may take up to 15-20 minutes to become globally available. 
                    The S3 direct URL works immediately if you need instant access.
                  </p>
                  <p className="text-blue-600 text-xs mt-1">
                    Note: If the S3 URL shows raw HTML instead of rendering the page, try refreshing the page or wait for CloudFront to become available.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {deployedUrl && (
          <div className="space-y-2">
            <Label>Your Application URL</Label>
            <div className="flex gap-2">
              <Input 
                value={deployedUrl} 
                readOnly 
                className="font-mono"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(deployedUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click the external link icon to open your deployed application
            </p>
          </div>
        )}

        {deploymentResult && (
          <div className="space-y-2">
            <h4 className="font-medium">Deployment Details</h4>
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              {deploymentResult.bucketName && (
                <div className="flex justify-between">
                  <span>S3 Bucket:</span>
                  <span className="font-mono">{deploymentResult.bucketName}</span>
                </div>
              )}
              {deploymentResult.bucketName && (
                <div className="flex justify-between">
                  <span>S3 Direct URL:</span>
                  <span className="font-mono text-xs">
                    <a 
                      href={`http://${deploymentResult.bucketName}.s3-website-us-east-1.amazonaws.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {deploymentResult.bucketName}.s3-website-us-east-1.amazonaws.com
                    </a>
                  </span>
                </div>
              )}
              {deploymentResult.distributionId && (
                <div className="flex justify-between">
                  <span>CloudFront Distribution:</span>
                  <span className="font-mono">{deploymentResult.distributionId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Deployment Method:</span>
                <span className="font-mono capitalize">{deploymentMethod}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium">Next Steps</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Your application is now live and accessible</p>
            <p>• Monitor your deployment in the dashboard</p>
            <p>• Configure custom domain settings if needed</p>
            <p>• Set up monitoring and alerts</p>
          </div>
        </div>

        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => handleStepNavigation('deploy')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deploy
          </Button>
          <Button 
            onClick={() => {
              setCurrentStep('upload');
              setProjectConfig({
                name: '',
                description: '',
                domain: '',
                files: []
              });
              setDeployedUrl('');
              setDeploymentResult(null);
            }}
          >
            Deploy Another Project
            <Rocket className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // MAIN RENDER
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Deploy Your Application</h1>
            <p className="text-muted-foreground">
              Follow the simple steps below to get your app live on the web
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {['upload', 'configure', 'scaling', 'deploy', 'success'].map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="ml-2 text-sm font-medium capitalize">{step}</span>
                  {index < 4 && <div className="w-8 h-px bg-muted mx-4" />}
                </div>
              ))}
            </div>
          </div>

          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'configure' && renderConfigureStep()}
          {currentStep === 'scaling' && renderScalingStep()}
          {currentStep === 'deploy' && renderDeployStep()}
          {currentStep === 'success' && renderSuccessStep()}
        </div>
      </div>
    </Layout>
  );
}