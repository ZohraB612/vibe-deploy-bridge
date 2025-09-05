import React, { useState } from 'react';
import { DeploymentDashboard } from '../components/deployment-dashboard';
import { ScalingControls } from '../components/scaling-controls';
import { MonitoringDashboard } from '../components/monitoring-dashboard';
import { DeploymentManagement } from '../components/deployment-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  BarChart3, 
  Activity, 
  Server, 
  Settings,
  Zap,
  Globe,
  Shield,
  Database,
  Cloud,
  Monitor
} from 'lucide-react';

export default function EnhancedDashboard() {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'deployments', label: 'Deployments', icon: Server },
    { id: 'scaling', label: 'Scaling', icon: Activity },
    { id: 'monitoring', label: 'Monitoring', icon: Monitor },
    { id: 'infrastructure', label: 'Infrastructure', icon: Cloud },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">DeployHub Enhanced</h1>
              </div>
              <div className="hidden md:flex items-center space-x-1 text-sm text-gray-500">
                <span>Advanced Deployment Platform</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  v2.0
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                Docs
              </Button>
              <Button size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-6">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger key={item.id} value={item.id} className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        <Tabs value={selectedTab} className="space-y-6">
          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <DeploymentDashboard />
          </TabsContent>

          {/* Deployments Tab */}
          <TabsContent value="deployments">
            <DeploymentManagement />
          </TabsContent>

          {/* Scaling Tab */}
          <TabsContent value="scaling">
            {selectedDeployment ? (
              <ScalingControls deploymentId={selectedDeployment} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Select a Deployment</CardTitle>
                  <CardDescription>
                    Choose a deployment to configure scaling settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No deployment selected</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Go to the Deployments tab to select a deployment
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <MonitoringDashboard />
          </TabsContent>

          {/* Infrastructure Tab */}
          <TabsContent value="infrastructure">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Infrastructure as Code</h2>
                <p className="text-gray-600">Manage your cloud infrastructure with Terraform</p>
              </div>

              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Cloud className="h-5 w-5" />
                      <span>Infrastructure Templates</span>
                    </CardTitle>
                    <CardDescription>
                      Pre-built infrastructure configurations for different deployment types
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-2 mb-2">
                          <Globe className="h-5 w-5 text-blue-500" />
                          <h3 className="font-medium">Static Website</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          S3 + CloudFront for static sites
                        </p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">S3</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">CloudFront</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">SSL</span>
                        </div>
                        <Button size="sm" className="w-full">
                          Deploy Infrastructure
                        </Button>
                      </div>

                      <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-2 mb-2">
                          <Server className="h-5 w-5 text-green-500" />
                          <h3 className="font-medium">Container App</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          ECS + ALB for containerized apps
                        </p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">ECS</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">ALB</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">VPC</span>
                        </div>
                        <Button size="sm" className="w-full">
                          Deploy Infrastructure
                        </Button>
                      </div>

                      <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-2 mb-2">
                          <Activity className="h-5 w-5 text-purple-500" />
                          <h3 className="font-medium">Kubernetes</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          EKS cluster with full monitoring
                        </p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">EKS</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">VPC</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">RDS</span>
                        </div>
                        <Button size="sm" className="w-full">
                          Deploy Infrastructure
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Settings</h2>
                <p className="text-gray-600">Configure your DeployHub environment</p>
              </div>

              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      <span>Security</span>
                    </CardTitle>
                    <CardDescription>
                      Configure security settings and access controls
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600">Add an extra layer of security</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Enable
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">API Keys</p>
                        <p className="text-sm text-gray-600">Manage your API access keys</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Monitor className="h-5 w-5" />
                      <span>Monitoring</span>
                    </CardTitle>
                    <CardDescription>
                      Configure monitoring and alerting settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">CloudWatch Integration</p>
                        <p className="text-sm text-gray-600">Connect to AWS CloudWatch</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Alert Channels</p>
                        <p className="text-sm text-gray-600">Set up notification channels</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
