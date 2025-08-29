import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { useAWS } from "@/contexts/AWSContext";
import { useProjects } from "@/contexts/ProjectContext";
import { Link } from "react-router-dom";
import { ResourceCleanup } from "@/components/ResourceCleanup";
import { 
  User, 
  Cloud, 
  Key, 
  Bell, 
  Shield,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Trash2
} from "lucide-react";

export default function Settings() {
  const { connection, disconnect } = useAWS();
  const { projects, deleteProject } = useProjects();
  
  console.log('Settings page loaded');
  console.log('Projects array:', projects);
  console.log('Projects length:', projects.length);
  console.log('deleteProject function:', deleteProject);
  
  const handleDeleteProject = async (project: any) => {
    console.log('Delete button clicked for project:', project);
    console.log('Project ID:', project.id);
    console.log('Project name:', project.name);
    
    const shouldCleanupAWS = confirm(
      `Are you sure you want to delete "${project.name}"?\n\n` +
      `This will:\n` +
      `• Remove the project from DeployHub\n` +
      `• ${project.awsBucket || project.awsDistributionId ? 'Clean up AWS resources (S3 bucket, CloudFront distribution)' : 'No AWS resources to clean up'}\n\n` +
      `This action cannot be undone.`
    );
    
    console.log('User confirmed deletion:', shouldCleanupAWS);
    
    if (shouldCleanupAWS) {
      console.log('Calling deleteProject function...');
      const success = await deleteProject(project.id);
      console.log('deleteProject result:', success);
      if (success) {
        alert(`Project "${project.name}" deleted successfully!${project.awsBucket || project.awsDistributionId ? '\n\nAWS resources have been cleaned up.' : ''}`);
      } else {
        console.error('Failed to delete project');
      }
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account and deployment preferences
          </p>
        </div>

        {/* Debug Section */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">Debug Info</h3>
          <p className="text-sm text-yellow-700">Projects: {projects.length}</p>
          <p className="text-sm text-yellow-700">deleteProject function: {typeof deleteProject}</p>
          <Button 
            onClick={() => {
              console.log('Test button clicked!');
              alert('Test button works!');
            }}
            variant="outline"
            size="sm"
          >
            Test Button
          </Button>
          
          {/* Simple HTML button test */}
          <div className="mt-4">
            <p className="text-sm text-yellow-700 mb-2">Testing with HTML button:</p>
            <button 
              type="button"
              onClick={() => {
                console.log('HTML button clicked!');
                alert('HTML button works!');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              HTML Delete Test
            </button>
          </div>
          
          {/* Project info display */}
          <div className="mt-4">
            <p className="text-sm text-yellow-700 mb-2">Project details:</p>
            {projects.map((project, index) => (
              <div key={project.id} className="text-xs text-yellow-600 mb-2">
                <p>Project {index + 1}: {project.name} (ID: {project.id})</p>
                <p>Domain: {project.domain} | Status: {project.status}</p>
                <p>AWS: {project.awsBucket || 'No bucket'} | CloudFront: {project.awsDistributionId || 'No distribution'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile</span>
              </CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="John" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Doe" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="john@example.com" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* AWS Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Cloud className="h-5 w-5" />
                <span>AWS Connection</span>
              </CardTitle>
              <CardDescription>
                Manage your cloud provider connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-primary rounded flex items-center justify-center">
                    <Cloud className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">AWS Account</p>
                    {connection && connection.is_active ? (
                      <div>
                        <p className="text-sm text-muted-foreground">Account: {connection.account_id}</p>
                        <p className="text-xs text-muted-foreground">Region: {connection.region}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {connection && connection.is_active ? (
                    <>
                      <Badge className="bg-success/10 text-success border-success/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                      <Button variant="outline" size="sm" onClick={disconnect}>
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                        Not Connected
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/setup/aws">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Connect AWS
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Secure Connection</p>
                    <p className="text-muted-foreground">
                      Your AWS credentials are never stored. We use IAM roles for secure, limited access.
                    </p>
                  </div>
                </div>
              </div>

              {connection && connection.is_active ? (
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/setup/aws">
                    Reconfigure AWS Account
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/setup/aws">
                    Connect AWS Account
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* AWS Resource Cleanup */}
          {connection && connection.is_active && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cloud className="h-5 w-5" />
                  <span>AWS Resource Cleanup</span>
                </CardTitle>
                <CardDescription>
                  Clean up old S3 buckets and CloudFront distributions that are no longer needed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResourceCleanup 
                  credentials={{
                    accessKeyId: connection.access_key_id,
                    secretAccessKey: connection.secret_access_key,
                    sessionToken: connection.session_token
                  }}
                  region={connection.region || 'us-east-1'}
                />
              </CardContent>
            </Card>
          )}

          {/* API Keys */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>API Access</span>
              </CardTitle>
              <CardDescription>
                Generate API keys for programmatic access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900 mb-1">Coming Soon</p>
                    <p className="text-yellow-700">
                      API access will be available in the next release. Stay tuned!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </CardTitle>
              <CardDescription>
                Configure how you receive updates about your deployments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Deployment Status</p>
                  <p className="text-sm text-muted-foreground">Get notified when deployments complete</p>
                </div>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Security Alerts</p>
                  <p className="text-sm text-muted-foreground">Important security and account updates</p>
                </div>
                <Badge className="bg-success/10 text-success border-success/20">Enabled</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Product Updates</p>
                  <p className="text-sm text-muted-foreground">New features and improvements</p>
                </div>
                <Button variant="outline" size="sm">Enable</Button>
              </div>
            </CardContent>
          </Card>

          {/* Project Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <span>Project Management</span>
              </CardTitle>
              <CardDescription>
                Manage your deployed projects and clean up old deployments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {projects.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    You have {projects.length} project{projects.length !== 1 ? 's' : ''} deployed. 
                    Deleting a project will remove it from DeployHub and optionally clean up AWS resources.
                  </p>
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Domain: {project.domain} • Status: {project.status}
                        </p>
                        {(project.awsBucket || project.awsDistributionId) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            AWS: {project.awsBucket && `S3: ${project.awsBucket}`}
                            {project.awsBucket && project.awsDistributionId && ' • '}
                            {project.awsDistributionId && `CloudFront: ${project.awsDistributionId}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-red-600 mb-2">
                          Button section rendered - Project: {project.name}
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            console.log('Delete Project button clicked!');
                            console.log('Project:', project);
                            handleDeleteProject(project);
                          }}
                          style={{
                            border: '3px solid red',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            padding: '12px 20px'
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          DELETE PROJECT
                        </Button>
                        
                        {/* Simple HTML button test */}
                        <button 
                          type="button"
                          onClick={() => {
                            console.log('HTML delete button clicked for project:', project.name);
                            alert(`HTML delete button works for: ${project.name}`);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          HTML Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No projects found.</p>
                  <Link to="/deploy">
                    <Button variant="outline" className="mt-2">
                      Deploy Your First Project
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-destructive/20 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}