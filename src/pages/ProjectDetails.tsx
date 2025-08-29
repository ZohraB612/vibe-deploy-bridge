import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useProjects } from "@/contexts/ProjectContext";
import { DeploymentLogs } from "@/components/deployment-logs";
import { EnvironmentVariables } from "@/components/environment-variables";
import { DeploymentSkeleton } from "@/components/deployment-skeleton";
import { LoadingSpinner } from "@/components/loading-spinner";
import { DeploymentTimeline } from "@/components/deployment-timeline";
import { DomainVerification } from "@/components/domain-verification";
import { PerformanceMetrics } from "@/components/performance-metrics";
import { UsageAnalytics } from "@/components/usage-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertCircle
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
}

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getProject, deleteProject } = useProjects();
  
  const project = getProject(id || "");
  
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

  const [activeTab, setActiveTab] = useState("overview");
  const [editingDeployment, setEditingDeployment] = useState<Deployment | null>(null);
  const [deploymentName, setDeploymentName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
  
  // Mock deployment data
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
  };

  const handleViewSite = () => {
    window.open(`https://${project.domain}`, '_blank');
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
              <Badge className={getStatusColor(project.status)}>
                {getStatusIcon(project.status)}
                <span className="ml-1 capitalize">{project.status}</span>
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span>{project.domain}</span>
              </div>
              <div className="flex items-center gap-1">
                <GitBranch className="h-4 w-4" />
                <span>{project.branch || "main"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Updated {project.lastDeployed.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleViewSite}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Site
            </Button>
            <Button onClick={handleRedeploy}>
              <Activity className="h-4 w-4 mr-2" />
              Redeploy
            </Button>
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
            <TabsTrigger value="environment">Variables</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Deployments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{project.deployments}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Framework</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold text-foreground">{project.framework || "Static Site"}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Build Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{project.buildTime || "N/A"}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Bundle Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{project.size || "N/A"}</div>
                </CardContent>
              </Card>
            </div>

            <DeploymentLogs deploymentId={project.id} isActive={project.status === "building"} />
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
            <DeploymentLogs deploymentId={project.id} isActive={project.status === "building"} />
          </TabsContent>

          <TabsContent value="environment" className="space-y-6">
            <EnvironmentVariables projectId={project.id} />
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