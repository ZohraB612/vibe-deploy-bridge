import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { DeploymentLogs } from "@/components/deployment-logs";
import { EnvironmentVariables } from "@/components/environment-variables";
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
  FileText
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
  
  // Mock project data - in real app, fetch from API
  const [project] = useState<Project>({
    id: id || "1",
    name: "My Awesome App",
    domain: "my-awesome-app.lovableapp.com",
    status: "active",
    lastDeployed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    deployments: 23,
    framework: "React + Vite",
    branch: "main",
    buildTime: "2m 34s",
    size: "1.2 MB"
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [editingDeployment, setEditingDeployment] = useState<Deployment | null>(null);
  const [deploymentName, setDeploymentName] = useState("");
  
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
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <span>{project.domain}</span>
              </div>
              <div className="flex items-center gap-1">
                <GitBranch className="h-4 w-4" />
                <span>{project.branch}</span>
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deployments">Deployments</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
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
                  <div className="text-2xl font-bold text-foreground">{project.framework}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Build Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{project.buildTime}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Bundle Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{project.size}</div>
                </CardContent>
              </Card>
            </div>

            <DeploymentLogs deploymentId={project.id} isActive={project.status === "building"} />
          </TabsContent>

          <TabsContent value="deployments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deployment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deployments.map((deployment) => (
                    <div key={deployment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge className={getDeploymentStatusColor(deployment.status)}>
                          {deployment.status === "active" ? "Active" : deployment.status}
                        </Badge>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              Deploy #{deployment.number}
                            </p>
                            <span className="text-xs text-muted-foreground font-mono">
                              {deployment.commitHash}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {deployment.commitMessage}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              {deployment.branch}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {deployment.createdAt.toLocaleDateString()}
                            </span>
                            {deployment.buildTime && (
                              <span>Build: {deployment.buildTime}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewLogs(deployment)}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          View Logs
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => handleEditDeployment(deployment)}>
                              <Edit3 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Deployment #{deployment.number}</DialogTitle>
                              <DialogDescription>
                                Update deployment settings and configuration.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="deployment-name">Deployment Name</Label>
                                <Input
                                  id="deployment-name"
                                  value={deploymentName}
                                  onChange={(e) => setDeploymentName(e.target.value)}
                                  placeholder="Enter deployment name"
                                />
                              </div>
                              <div>
                                <Label>Commit Hash</Label>
                                <Input value={deployment.commitHash} readOnly />
                              </div>
                              <div>
                                <Label>Branch</Label>
                                <Input value={deployment.branch} readOnly />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingDeployment(null)}>
                                Cancel
                              </Button>
                              <Button onClick={handleSaveDeployment}>
                                Save Changes
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {deployment.status !== "active" && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRollback(deployment)}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Rollback
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Deployment</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete deployment #{deployment.number}? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteDeployment(deployment)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="environment" className="space-y-6">
            <EnvironmentVariables projectId={project.id} />
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
                        <Button variant="destructive">
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