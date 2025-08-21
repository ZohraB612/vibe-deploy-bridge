import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

interface DeploymentTimelineProps {
  projectId: string;
}

export function DeploymentTimeline({ projectId }: DeploymentTimelineProps) {
  const { toast } = useToast();
  
  const [deployments] = useState<TimelineDeployment[]>([
    {
      id: "deploy-1",
      number: 45,
      status: "success",
      commitHash: "a1b2c3d",
      commitMessage: "Add payment integration and user dashboard improvements",
      author: "john.doe",
      branch: "main",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      buildTime: "3m 42s",
      size: "2.1 MB",
      deploymentUrl: "https://app-v45.mydomain.com"
    },
    {
      id: "deploy-2",
      number: 44,
      status: "rolled-back",
      commitHash: "e4f5g6h",
      commitMessage: "Update dependencies and security patches",
      author: "jane.smith",
      branch: "main",
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
      buildTime: "2m 18s",
      rollbackSource: "deploy-43",
      size: "2.0 MB"
    },
    {
      id: "deploy-3",
      number: 43,
      status: "success",
      commitHash: "i7j8k9l",
      commitMessage: "Fix authentication flow and improve error handling",
      author: "john.doe",
      branch: "hotfix/auth-bug",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      buildTime: "2m 56s",
      size: "1.9 MB",
      deploymentUrl: "https://app-v43.mydomain.com"
    },
    {
      id: "deploy-4",
      number: 42,
      status: "failed",
      commitHash: "m0n1o2p",
      commitMessage: "Implement new feature with advanced analytics",
      author: "alex.johnson",
      branch: "feature/analytics",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      buildTime: "1m 23s",
      size: "1.8 MB"
    },
    {
      id: "deploy-5",
      number: 41,
      status: "success",
      commitHash: "q3r4s5t",
      commitMessage: "Initial project setup and core functionality",
      author: "team.lead",
      branch: "main",
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      buildTime: "4m 12s",
      size: "1.6 MB",
      deploymentUrl: "https://app-v41.mydomain.com"
    }
  ]);

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

  const handleRollback = (deployment: TimelineDeployment) => {
    toast({
      title: "Rollback initiated",
      description: `Rolling back to deployment #${deployment.number}`,
    });
  };

  const handleViewLogs = (deployment: TimelineDeployment) => {
    toast({
      title: "Opening logs",
      description: `Viewing deployment logs for #${deployment.number}`,
    });
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewLogs(deployment)}
                          className="h-7 px-2 text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Logs
                        </Button>
                        
                        {deployment.deploymentUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDeployment(deployment)}
                            className="h-7 px-2 text-xs"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            View
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