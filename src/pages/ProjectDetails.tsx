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
  Terminal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={i === 0 ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                          {i === 0 ? "Active" : "Previous"}
                        </Badge>
                        <div>
                          <p className="font-medium">
                            Deploy #{project.deployments - i}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          View Logs
                        </Button>
                        {i !== 0 && (
                          <Button variant="outline" size="sm">
                            Rollback
                          </Button>
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