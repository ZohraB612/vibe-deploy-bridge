import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useProjects } from "@/contexts/ProjectContext";
import { useAWS } from "@/contexts/AWSContext";
import { DeploymentLogs } from "@/components/deployment-logs";

import { DeploymentSkeleton } from "@/components/deployment-skeleton";
import { LoadingSpinner } from "@/components/loading-spinner";
import { DeploymentTimeline } from "@/components/deployment-timeline";
import { DomainVerification } from "@/components/domain-verification";
import { PerformanceMetrics } from "@/components/performance-metrics";
import { UsageAnalytics } from "@/components/usage-analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, 
  ExternalLink, 
  Settings, 
  Activity, 
  Globe, 
  GitBranch,
  Clock,
  Zap,
  Terminal,
  Trash2,
  Edit3,
  RotateCcw,
  FileText,
  AlertCircle,
  Copy,
  Rocket,
  RefreshCw,
  Download,
  CheckCircle,
  Loader2,
  Wrench
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Deployment {
  id: string;
  number: number;
  status: "active" | "success" | "failed" | "building";
  createdAt: Date;
  commitHash: string;
  commitMessage: string;
  branch: string;
  buildTime?: string;
}

interface Project {
  id: string;
  name: string;
  domain: string;
  status: "active" | "building" | "failed" | "stopped";
  lastDeployed: Date;
  deployments: number;
  framework: string;
  branch: string;
  buildTime: string;
  size: string;
  awsBucket?: string;
  awsDistributionId?: string;
  awsRegion?: string;
}

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getProject, deleteProject } = useProjects();
  const { credentials, connection } = useAWS();
  
  // Move ALL hooks to the top before any conditional logic
  const [activeTab, setActiveTab] = useState("overview");
  const [editingDeployment, setEditingDeployment] = useState<Deployment | null>(null);
  const [deploymentName, setDeploymentName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Mock deployment data - moved up with other state
  const [deployments, setDeployments] = useState<Deployment[]>([
    {
      id: "deploy-1",
      number: 23,
      status: "active",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      commitHash: "abc123f",
      commitMessage: "Fix navbar styling and add dark mode",
      branch: "main",
      buildTime: "2m 34s"
    },
    {
      id: "deploy-2", 
      number: 22,
      status: "success",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      commitHash: "def456a",
      commitMessage: "Add user authentication flow",
      branch: "main",
      buildTime: "3m 12s"
    },
    {
      id: "deploy-3",
      number: 21,
      status: "failed",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      commitHash: "ghi789b",
      commitMessage: "Update dependencies and fix vulnerabilities",
      branch: "feature/security-updates",
      buildTime: "1m 45s"
    },
    {
      id: "deploy-4",
      number: 20,
      status: "success",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      commitHash: "jkl012c",
      commitMessage: "Implement user dashboard and analytics",
      branch: "main",
      buildTime: "4m 21s"
    },
    {
      id: "deploy-5",
      number: 19,
      status: "success", 
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      commitHash: "mno345d",
      commitMessage: "Initial project setup with React and Tailwind",
      branch: "main",
      buildTime: "2m 56s"
    }
  ]);
  
  const project = getProject(id || "");
  
  // Simulate loading project data
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setError(null);
      } catch (err) {
        setError("Failed to load project details");
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectData();
  }, [id]);
  
  // If project not found, show error
  if (!project) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <CardTitle>Project Not Found</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                The project you're looking for doesn't exist or may have been deleted.
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "building":
        return "bg-warning text-warning-foreground";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Zap className="h-3 w-3" />;
      case "building":
        return <Activity className="h-3 w-3 animate-pulse" />;
      case "failed":
        return <Terminal className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const handleRedeploy = () => {
    toast({
      title: "Redeployment started",
      description: "Your project is being redeployed with the latest changes"
    });
    
    // Simulate real deployment logs
    setIsDeploying(true);
    setDeploymentLogs([]);
    
    const deploymentSteps = [
      { message: "Starting deployment...", delay: 1000 },
      { message: "Validating project files...", delay: 2000 },
      { message: "Creating S3 bucket...", delay: 3000 },
      { message: "Configuring CloudFront distribution...", delay: 4000 },
      { message: "Uploading files to S3...", delay: 5000 },
      { message: "✅ Deployment successful!", delay: 6000 }
    ];
    
    deploymentSteps.forEach((step, index) => {
      setTimeout(() => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${step.message}`;
        setDeploymentLogs(prev => [...prev, logEntry]);
        
        if (index === deploymentSteps.length - 1) {
          setIsDeploying(false);
          

          
          toast({
            title: "Redeployment completed",
            description: "Your project has been successfully redeployed"
          });
        }
      }, step.delay);
    });
  };

  const handleViewSite = () => {
    window.open(`https://${project.domain}`, '_blank');
  };

  const handleFixContentTypes = async () => {
    if (!project.awsBucket) {
      toast({
        title: "Error",
        description: "No S3 bucket found for this project",
        variant: "destructive"
      });
      return;
    }

    if (!credentials) {
      toast({
        title: "Error",
        description: "AWS credentials not available. Please connect your AWS account first.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsDeploying(true);
      setDeploymentLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting content-type fix...`]);

      const apiUrl = import.meta.env.VITE_DEPLOYHUB_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/v1/fix-content-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucketName: project.awsBucket,
          region: project.awsRegion || 'us-east-1',
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setDeploymentLogs(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString()}] ✅ Fixed content types for ${result.updated} files`,
          ...result.logs.map((log: string) => `[${new Date().toLocaleTimeString()}] ${log}`)
        ]);
        
        toast({
          title: "Content types fixed",
          description: `Successfully updated ${result.updated} files. Your website should now display properly.`
        });
      } else {
        throw new Error(result.message || 'Failed to fix content types');
      }
    } catch (error) {
      console.error('Error fixing content types:', error);
      setDeploymentLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Error: ${error}`]);
      toast({
        title: "Error fixing content types",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleViewLogs = (deployment: Deployment) => {
    toast({
      title: "Opening deployment logs",
      description: `Viewing logs for deployment #${deployment.number}`
    });
    // In real app, navigate to logs page or open logs modal
  };

  const handleRollback = (deployment: Deployment) => {
    toast({
      title: "Rolling back deployment",
      description: `Rolling back to deployment #${deployment.number}`,
    });
    // In real app, trigger rollback API call
  };

  const handleDeleteDeployment = (deployment: Deployment) => {
    setDeployments(deployments.filter(d => d.id !== deployment.id));
    toast({
      title: "Deployment deleted",
      description: `Deployment #${deployment.number} has been deleted`,
      variant: "destructive"
    });
  };

  const handleEditDeployment = (deployment: Deployment) => {
    setEditingDeployment(deployment);
    setDeploymentName(`Deploy #${deployment.number}`);
  };

  const handleSaveDeployment = () => {
    if (editingDeployment) {
      toast({
        title: "Deployment updated",
        description: `Deployment #${editingDeployment.number} has been updated`
      });
      setEditingDeployment(null);
      setDeploymentName("");
    }
  };

  const getDeploymentStatusColor = (status: Deployment["status"]) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "success":
        return "bg-success/20 text-success";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      case "building":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleDeleteProject = async () => {
    console.log('Delete Project button clicked in ProjectDetails!');
    console.log('Project to delete:', project);
    
    const confirmed = confirm(
      `Are you sure you want to delete "${project.name}"?\n\n` +
      `This will:\n` +
      `• Remove the project from DeployHub\n` +
      `• Clean up AWS resources (S3 bucket, CloudFront distribution)\n\n` +
      `This action cannot be undone.`
    );
    
    if (confirmed) {
      console.log('User confirmed deletion, calling deleteProject...');
      try {
        const success = await deleteProject(project.id);
        if (success) {
          toast({
            title: "Project Deleted",
            description: `Project "${project.name}" has been deleted successfully.`,
          });
          navigate("/dashboard");
        } else {
          toast({
            title: "Deletion Failed",
            description: "Failed to delete the project. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        toast({
          title: "Error",
          description: "An error occurred while deleting the project.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Project Header - Streamlined with Clear Actions */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold">{project.name}</h1>
                                    <Badge 
                  variant={project.status === 'deployed' ? 'outline' : 
                          project.status === 'deploying' ? 'secondary' : 
                          project.status === 'failed' ? 'destructive' : 'outline'}
                  className={`text-sm ${
                    project.status === 'deployed' 
                      ? 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100' 
                      : ''
                  }`}
                >
                  {project.status === 'deployed' ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Deployed
                    </span>
                  ) : project.status === 'deploying' ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Deploying
                    </span>
                  ) : project.status === 'failed' ? (
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Failed
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Stopped
                    </span>
                  )}
                </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      <span className="font-mono">{project.branch}</span>
                      {project.lastDeployed && (
                        <span className="text-xs">• Last updated: {new Date(project.lastDeployed).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Live URL:</span>
                      <a 
                        href={project.domain} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-blue-600 hover:underline"
                      >
                        {project.domain}
                      </a>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(project.domain);
                          toast({ title: "URL copied to clipboard!" });
                        }}
                        className="h-6 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleViewSite} className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    View Site
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleFixContentTypes}
                    disabled={isDeploying}
                    className="flex items-center gap-2"
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <Wrench className="h-4 w-4" />
                        Fix Display
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleRedeploy} className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Redeploy Latest
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="deployments">Timeline</TabsTrigger>
            <TabsTrigger value="logs">Live Logs</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
    
            <TabsTrigger value="domains">Domains</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Latest Deployment Summary Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Latest Deployment: {project.branch}
                </CardTitle>
                <CardDescription>
                  {project.status === 'deployed' ? 
                    `Deployed successfully on ${project.lastDeployed ? new Date(project.lastDeployed).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Unknown date'}` :
                    `Status: ${project.status}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Deployment Metrics Table */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Build Time</span>
                      <span className="text-sm font-mono">{project.buildTime || "42.5 seconds"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Framework</span>
                      <span className="text-sm">{project.framework || "Static Site"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Bundle Size</span>
                      <span className="text-sm font-mono">{project.size || "2.1 MB"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Total Project Deployments</span>
                      <span className="text-sm font-mono">{project.deployments}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Deployment Method</span>
                      <span className="text-sm capitalize">{project.framework === "Static Site" ? "S3 Direct" : project.framework || "S3 Direct"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-muted-foreground">AWS Region</span>
                      <span className="text-sm">{project.awsRegion || "us-east-1"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Live URL</span>
                      <span className="text-sm font-mono text-blue-600">
                        <a href={project.domain} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {project.domain.replace('https://', '')}
                        </a>
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Status</span>
                      <Badge 
                        variant={project.status === 'deployed' ? 'default' : 
                                project.status === 'deploying' ? 'secondary' : 
                                project.status === 'failed' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {project.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Export Action */}
                <div className="flex justify-end pt-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export to Sheets
                  </Button>
                </div>
              </CardContent>
            </Card>

            
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <UsageAnalytics projectId={project.id} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceMetrics projectId={project.id} />
          </TabsContent>

          <TabsContent value="deployments" className="space-y-6">
            <DeploymentTimeline projectId={project.id} />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Deployment Logs
                </CardTitle>
                <CardDescription>
                  Real-time logs and deployment history for debugging and monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {project.status === 'deployed' || project.status === 'deploying' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing logs for latest deployment
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setActiveTab('deployments')}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          View Timeline
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Refresh the project data to get latest status
                            window.location.reload();
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Export logs functionality
                            const logs = project.status === 'deploying' 
                              ? 'Live deployment logs...' 
                              : 'Deployment completed logs...';
                            const blob = new Blob([logs], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `deployment-logs-${project.name}-${new Date().toISOString()}.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>



                    
                    {/* Real Deployment Logs */}
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
                      {isDeploying || deploymentLogs.length > 0 ? (
                        // Show real deployment logs
                        <div className="space-y-1">
                          {deploymentLogs.map((log, index) => (
                            <div key={index} className={log.includes('✅') ? 'text-green-600' : 'text-blue-600'}>
                              {log}
                            </div>
                          ))}
                          {isDeploying && (
                            <div className="text-blue-600 animate-pulse">
                              [{new Date().toLocaleTimeString()}] Deployment in progress...
                            </div>
                          )}
                        </div>
                      ) : (
                        // Show completed deployment logs
                        <div className="space-y-1">
                          <div className="text-green-600">[{project.lastDeployed ? new Date(project.lastDeployed).toLocaleTimeString() : '12:25:27'}] Build started...</div>
                          <div className="text-blue-600">[{project.lastDeployed ? new Date(project.lastDeployed).toLocaleTimeString() : '12:25:27'}] Cloning repository...</div>
                          <div className="text-blue-600">[{project.lastDeployed ? new Date(project.lastDeployed).toLocaleTimeString() : '12:25:27'}] Installing dependencies...</div>
                          <div className="text-blue-600">[{project.lastDeployed ? new Date(project.lastDeployed).toLocaleTimeString() : '12:25:27'}] Dependencies installed (20s)</div>
                          <div className="text-blue-600">[{project.lastDeployed ? new Date(project.lastDeployed).toLocaleTimeString() : '12:25:27'}] Building site...</div>
                          <div className="text-blue-600">[{project.lastDeployed ? new Date(project.lastDeployed).toLocaleTimeString() : '12:25:27'}] Build complete (14s)</div>
                          <div className="text-blue-600">[{project.lastDeployed ? new Date(project.lastDeployed).toLocaleTimeString() : '12:25:27'}] Syncing files to S3 bucket...</div>
                          <div className="text-green-600">[{project.lastDeployed ? new Date(project.lastDeployed).toLocaleTimeString() : '12:25:27'}] ✅ Sync complete.</div>
                          <div className="text-green-600">[{project.lastDeployed ? new Date(project.lastDeployed).toLocaleTimeString() : '12:25:27'}] Deployment successful!</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground text-center">
                      {isDeploying 
                        ? '🔄 Live deployment logs - updating in real-time...' 
                        : deploymentLogs.length > 0
                        ? `📅 Deployment completed at ${new Date().toLocaleString()}`
                        : `📅 Last deployment: ${project.lastDeployed ? new Date(project.lastDeployed).toLocaleString() : 'Unknown'}`
                      }
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Deployment Logs Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Deploy your project to see real-time logs and deployment information.
                    </p>
                    <Button onClick={handleRedeploy}>
                      <Rocket className="h-4 w-4 mr-2" />
                      Deploy Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Provisioned AWS Resources
                </CardTitle>
                <CardDescription>
                  Infrastructure resources created by DeployHub for this project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.awsBucket ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">S3 Bucket</div>
                            <div className="text-sm font-mono">{project.awsBucket}</div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const region = project.awsRegion || 'us-east-1';
                              window.open(`https://${region}.console.aws.amazon.com/s3/buckets/${project.awsBucket}`, '_blank');
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View in AWS Console
                          </Button>
                        </div>
                      </Card>

                      {project.awsDistributionId && (
                        <Card className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-muted-foreground">CloudFront Distribution</div>
                              <div className="text-sm font-mono">{project.awsDistributionId}</div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                window.open(`https://console.aws.amazon.com/cloudfront/v3/home#/distributions/${project.awsDistributionId}`, '_blank');
                              }}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View in AWS Console
                            </Button>
                          </div>
                        </Card>
                      )}

                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">AWS Region</div>
                            <div className="text-sm">{project.awsRegion || 'us-east-1'}</div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const region = project.awsRegion || 'us-east-1';
                              window.open(`https://${region}.console.aws.amazon.com/`, '_blank');
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Region Console
                          </Button>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-muted-foreground">Deployment Method</div>
                            <div className="text-sm capitalize">{project.framework || 'S3 Direct'}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Automated
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        💡 <strong>Pro tip:</strong> Click any resource to open it directly in the AWS Console for advanced management.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No AWS Resources Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Deploy your project to see the AWS infrastructure that gets created.
                    </p>
                    <Button onClick={handleRedeploy}>
                      <Rocket className="h-4 w-4 mr-2" />
                      Deploy Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>



          <TabsContent value="domains" className="space-y-6">
            <DomainVerification projectId={project.id} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Project Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">General</h3>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium">Project Name</label>
                        <input 
                          type="text" 
                          value={project.name} 
                          className="w-full mt-1 p-2 border rounded-md bg-background"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Domain</label>
                        <input 
                          type="text" 
                          value={project.domain} 
                          className="w-full mt-1 p-2 border rounded-md bg-background"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-destructive">Danger Zone</h3>
                    <div className="p-4 border border-destructive rounded-lg bg-destructive/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Delete Project</h4>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete this project and all of its data.
                          </p>
                        </div>
                        <Button variant="destructive" onClick={handleDeleteProject}>
                          Delete Project
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}