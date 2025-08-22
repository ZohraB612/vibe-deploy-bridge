import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { useProjects } from "@/contexts/ProjectContext";
import { useAWSStatus } from "@/hooks/use-aws-status";
import { Plus, ExternalLink, Clock, CheckCircle, AlertCircle, Zap, RefreshCw, Globe } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";



const getStatusIcon = (status: string) => {
  switch (status) {
    case "deployed":
      return <CheckCircle className="h-4 w-4 text-success" />;
    case "deploying":
      return <Clock className="h-4 w-4 text-warning animate-spin" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "deployed":
      return "bg-success/10 text-success border-success/20";
    case "deploying":
      return "bg-warning/10 text-warning border-warning/20";
    case "failed":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { projects, isLoading, error, refreshProjects } = useProjects();
  const { hasAWSConnection, isLoading: isAWSLoading } = useAWSStatus();

  // Redirect to AWS setup if user doesn't have AWS connection
  useEffect(() => {
    if (!isAWSLoading && hasAWSConnection === false) {
      navigate('/setup/aws', { replace: true });
    }
  }, [hasAWSConnection, isAWSLoading, navigate]);

  // Don't render dashboard if still checking AWS status or if redirecting
  if (isAWSLoading || hasAWSConnection === false) {
    return null;
  }
  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <CardTitle>Error Loading Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="flex gap-2">
                <Button onClick={refreshProjects}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <DashboardSkeleton />
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Your Projects</h1>
              <p className="text-muted-foreground mt-2">
                Manage and deploy your applications with one click
              </p>
            </div>
            <Link to="/deploy">
              <Button size="lg" className="bg-gradient-primary hover:shadow-glow transition-all">
                <Plus className="h-5 w-5 mr-2" />
                New Deployment
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground">Active projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Deployments</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects.filter(p => p.status === "deployed" || p.status === "deploying").length}
              </div>
              <p className="text-xs text-muted-foreground">Running smoothly</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deployments</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projects.reduce((total, project) => total + project.deployments, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Successful deploys</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-soft transition-all cursor-pointer" onClick={() => navigate('/domains')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3">
                  <Globe className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Domain Management</h3>
                  <p className="text-muted-foreground text-sm">
                    Manage your domains, DNS records, and SSL certificates
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Manage Domains
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-soft transition-all cursor-pointer" onClick={() => navigate('/deploy')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <Zap className="h-8 w-8 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">New Deployment</h3>
                  <p className="text-muted-foreground text-sm">
                    Deploy a new application or update existing ones
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Deploy Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
          
          {projects.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <div className="rounded-full bg-muted p-4">
                    <Zap className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">No projects yet</h3>
                    <p className="text-muted-foreground max-w-md">
                      Get started by deploying your first application. It only takes a few clicks!
                    </p>
                  </div>
                  <Link to="/deploy">
                    <Button className="bg-gradient-primary">
                      <Plus className="h-4 w-4 mr-2" />
                      Deploy Your First App
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-soft transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{project.name}</h3>
                          <Badge className={getStatusColor(project.status)}>
                            {getStatusIcon(project.status)}
                            <span className="ml-1 capitalize">{project.status}</span>
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {project.domain}
                          </span>
                          <span className="hidden sm:block">•</span>
                          <span>Last deployed {project.lastDeployed.toLocaleDateString()}</span>
                          <span className="hidden sm:block">•</span>
                          <span>{project.deployments} deployments</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/project/${project.id}`)}
                          className="w-full sm:w-auto"
                        >
                          View Details
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="sm:w-auto"
                          onClick={() => window.open(`https://${project.domain}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 sm:mr-0 mr-2" />
                          <span className="sm:hidden">Visit Site</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}