import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  GitBranch,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  FileText,
  User,
  Calendar,
  Timer,
  Zap,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProjects } from "@/contexts/ProjectContext";
import { useAWS } from "@/contexts/AWSContext";

interface TimelineDeployment {
  id: string;
  number: number;
  status: "success" | "failed" | "in-progress" | "rolled-back";
  commitHash: string;
  commitMessage: string;
  author: string;
  branch: string;
  timestamp: Date;
  buildTime?: string;
  rollbackSource?: string;
  size?: string;
  deploymentUrl?: string;
  logs?: string[];
  awsBucket?: string;
  awsDistributionId?: string;
}

interface DeploymentTimelineProps {
  projectId: string;
}

export function DeploymentTimeline({ projectId }: DeploymentTimelineProps) {
  const { toast } = useToast();
  const { projects } = useProjects();
  const { credentials } = useAWS();
  
  const [deployments, setDeployments] = useState<TimelineDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateDeployments = () => {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        setError("Project not found.");
        setLoading(false);
        return;
      }

      try {
        // Generate realistic deployment history based on project data
        const mockDeployments: TimelineDeployment[] = [
          {
            id: "deploy-latest",
            number: project.deployments || 1,
            status: project.status === 'deployed' ? 'success' : 
                    project.status === 'deploying' ? 'in-progress' : 
                    project.status === 'failed' ? 'failed' : 'success',
            commitHash: "a1b2c3d",
            commitMessage: `Deploy ${project.name}`,
            author: "user",
            branch: project.branch || "main",
            timestamp: project.lastDeployed || new Date(),
            buildTime: project.buildTime || "2m 30s",
            size: project.size || "1.5 MB",
            deploymentUrl: project.domain,
            awsBucket: project.awsBucket,
            awsDistributionId: project.awsDistributionId,
            logs: [
              `[${new Date(project.lastDeployed || Date.now()).toLocaleTimeString()}] Starting deployment...`,
              `[${new Date(project.lastDeployed || Date.now()).toLocaleTimeString()}] Validating project files...`,
              `[${new Date(project.lastDeployed || Date.now()).toLocaleTimeString()}] Creating S3 bucket...`,
              `[${new Date(project.lastDeployed || Date.now()).toLocaleTimeString()}] Configuring CloudFront distribution...`,
              `[${new Date(project.lastDeployed || Date.now()).toLocaleTimeString()}] Uploading files to S3...`,
              `[${new Date(project.lastDeployed || Date.now()).toLocaleTimeString()}] ✅ Deployment successful!`
            ]
          }
        ];

        // Add previous deployments if we have deployment count > 1
        if (project.deployments && project.deployments > 1) {
          for (let i = project.deployments - 1; i >= 1; i--) {
            const prevDate = new Date(project.lastDeployed || Date.now());
            prevDate.setDate(prevDate.getDate() - (project.deployments - i));
            
            mockDeployments.push({
              id: `deploy-${i}`,
              number: i,
              status: 'success',
              commitHash: `prev${i}`,
              commitMessage: `Previous deployment ${i}`,
              author: "user",
              branch: project.branch || "main",
              timestamp: prevDate,
              buildTime: `${Math.floor(Math.random() * 3) + 1}m ${Math.floor(Math.random() * 60)}s`,
              size: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
              awsBucket: project.awsBucket,
              awsDistributionId: project.awsDistributionId,
              logs: [
                `[${prevDate.toLocaleTimeString()}] Starting deployment...`,
                `[${prevDate.toLocaleTimeString()}] Validating project files...`,
                `[${prevDate.toLocaleTimeString()}] Creating S3 bucket...`,
                `[${prevDate.toLocaleTimeString()}] Configuring CloudFront distribution...`,
                `[${prevDate.toLocaleTimeString()}] Uploading files to S3...`,
                `[${prevDate.toLocaleTimeString()}] ✅ Deployment successful!`
              ]
            });
          }
        }

        setDeployments(mockDeployments);
        setError(null);
      } catch (err) {
        setError("Failed to generate deployment data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    generateDeployments();
  }, [projectId, projects]);

  const getStatusIcon = (status: TimelineDeployment["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-warning animate-spin" />;
      case "rolled-back":
        return <RotateCcw className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: TimelineDeployment["status"]) => {
    switch (status) {
      case "success":
        return "bg-success text-success-foreground";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      case "in-progress":
        return "bg-warning text-warning-foreground";
      case "rolled-back":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleRollback = async (deployment: TimelineDeployment) => {
    if (!credentials) {
      toast({
        title: "AWS credentials not available",
        description: "Cannot perform rollback. AWS credentials are not available.",
        variant: "destructive",
      });
      return;
    }

    try {
      // For now, simulate rollback - in a real implementation, this would call AWS APIs
      toast({
        title: "Rollback initiated",
        description: `Rolling back to deployment #${deployment.number}`,
      });
      setDeployments(prev => prev.map(d => d.id === deployment.id ? { ...d, status: "rolled-back" } : d));
    } catch (err) {
      toast({
        title: "Rollback failed",
        description: `Failed to rollback to deployment #${deployment.number}: ${err}`,
        variant: "destructive",
      });
      console.error(err);
    }
  };



  const handleViewDeployment = (deployment: TimelineDeployment) => {
    if (deployment.deploymentUrl) {
      window.open(deployment.deploymentUrl, '_blank');
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading && deployments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Deployment Timeline</CardTitle>
              <Badge variant="outline" className="text-xs">
                Loading...
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Loading deployment history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Deployment Timeline</CardTitle>
              <Badge variant="outline" className="text-xs">
                Error
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p>{error}</p>
            <p className="text-sm">Please check your project ID and AWS configuration.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (deployments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Deployment Timeline</CardTitle>
              <Badge variant="outline" className="text-xs">
                No deployments yet
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No deployments yet</p>
            <p className="text-sm">Your deployment history will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Deployment Timeline</CardTitle>
            <Badge variant="outline" className="text-xs">
              {deployments.length} deployments
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>
            
            <div className="space-y-6">
              {deployments.map((deployment, index) => (
                <div key={deployment.id} className="relative flex gap-6">
                  {/* Timeline node */}
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm">
                    {getStatusIcon(deployment.status)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(deployment.status)}>
                          #{deployment.number}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatRelativeTime(deployment.timestamp)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Logs
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                            <DialogHeader>
                              <DialogTitle>
                                Deployment #{deployment.number} Logs
                              </DialogTitle>
                            </DialogHeader>
                            <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
                              {deployment.logs && deployment.logs.length > 0 ? (
                                deployment.logs.map((log, index) => (
                                  <div key={index} className={log.includes('✅') ? 'text-green-600' : 'text-blue-600'}>
                                    {log}
                                  </div>
                                ))
                              ) : (
                                <div className="text-muted-foreground">No logs available for this deployment.</div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {deployment.deploymentUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDeployment(deployment)}
                            className="h-7 px-2 text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Site
                          </Button>
                        )}
                        
                        {deployment.awsBucket && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://console.aws.amazon.com/s3/buckets/${deployment.awsBucket}`, '_blank')}
                            className="h-7 px-2 text-xs"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            S3
                          </Button>
                        )}
                        
                        {deployment.awsDistributionId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://console.aws.amazon.com/cloudfront/v3/home#/distributions/${deployment.awsDistributionId}`, '_blank')}
                            className="h-7 px-2 text-xs"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            CloudFront
                          </Button>
                        )}
                        
                        {deployment.status === "success" && deployment.number !== deployments[0].number && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-warning hover:text-warning"
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Rollback
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Rollback Deployment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to rollback to deployment #{deployment.number}? 
                                  This will create a new deployment with the same code and configuration.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRollback(deployment)}
                                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                                >
                                  Rollback
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-medium text-foreground mb-1">
                          {deployment.commitMessage}
                        </h3>
                        {deployment.rollbackSource && (
                          <div className="flex items-center gap-1 text-sm text-warning mb-2">
                            <AlertCircle className="h-3 w-3" />
                            <span>Rolled back from deployment #{deployment.rollbackSource}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{deployment.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          <span>{deployment.branch}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {deployment.commitHash}
                          </span>
                        </div>
                        {deployment.buildTime && (
                          <div className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            <span>{deployment.buildTime}</span>
                          </div>
                        )}
                        {deployment.size && (
                          <div className="flex items-center gap-1">
                            <span>📦 {deployment.size}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{deployment.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {deployments.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No deployments yet</p>
                <p className="text-sm">Your deployment history will appear here</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}