import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { Plus, ExternalLink, Clock, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const mockProjects = [
  {
    id: 1,
    name: "My Portfolio Site",
    domain: "my-portfolio.netlify.app",
    status: "deployed",
    lastDeployed: "2 hours ago",
    deployments: 12,
  },
  {
    id: 2,
    name: "Blog Website", 
    domain: "my-blog.com",
    status: "deploying",
    lastDeployed: "5 minutes ago",
    deployments: 8,
  },
  {
    id: 3,
    name: "E-commerce Store",
    domain: "shop.example.com", 
    status: "failed",
    lastDeployed: "1 day ago",
    deployments: 3,
  },
];

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
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">+1 from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Deployments</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">Running smoothly</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deployments</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">Successful deploys</p>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
          
          {mockProjects.length === 0 ? (
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
              {mockProjects.map((project) => (
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
                          <span>Last deployed {project.lastDeployed}</span>
                          <span className="hidden sm:block">•</span>
                          <span>{project.deployments} deployments</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
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