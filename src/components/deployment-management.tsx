import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  BarChart3, 
  Activity, 
  Server, 
  Database,
  Globe,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Trash2,
  Edit,
  Eye,
  Download
} from 'lucide-react';

interface Deployment {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'deploying' | 'failed' | 'scaling';
  health: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  replicas: {
    current: number;
    desired: number;
    min: number;
    max: number;
  };
  resources: {
    cpu: number;
    memory: number;
    storage: number;
  };
  traffic: {
    current: number;
    peak: number;
    average: number;
  };
  lastDeployment: string;
  strategy: 'blue-green' | 'canary' | 'rolling' | 'recreate';
  environment: 'dev' | 'staging' | 'prod';
  version: string;
  createdAt: string;
  updatedAt: string;
}

interface DeploymentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'static' | 'container' | 'kubernetes' | 'serverless';
  features: string[];
  estimatedCost: number;
  complexity: 'simple' | 'medium' | 'complex';
}

export function DeploymentManagement() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [templates, setTemplates] = useState<DeploymentTemplate[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadDeployments();
    loadTemplates();
  }, []);

  const loadDeployments = async () => {
    try {
      // Mock data - in real implementation, fetch from API
      const mockDeployments: Deployment[] = [
        {
          id: '1',
          name: 'react-ecommerce',
          status: 'running',
          health: 'healthy',
          uptime: 99.9,
          replicas: { current: 3, desired: 3, min: 2, max: 10 },
          resources: { cpu: 45, memory: 62, storage: 12 },
          traffic: { current: 1250, peak: 2100, average: 980 },
          lastDeployment: '2 hours ago',
          strategy: 'blue-green',
          environment: 'prod',
          version: 'v1.2.3',
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          name: 'api-gateway',
          status: 'scaling',
          health: 'healthy',
          uptime: 99.8,
          replicas: { current: 5, desired: 7, min: 2, max: 20 },
          resources: { cpu: 78, memory: 85, storage: 8 },
          traffic: { current: 3200, peak: 4500, average: 2800 },
          lastDeployment: '1 hour ago',
          strategy: 'canary',
          environment: 'prod',
          version: 'v2.1.0',
          createdAt: '2024-01-08T00:00:00Z',
          updatedAt: '2024-01-15T11:00:00Z'
        },
        {
          id: '3',
          name: 'user-service',
          status: 'deploying',
          health: 'degraded',
          uptime: 98.5,
          replicas: { current: 2, desired: 2, min: 1, max: 5 },
          resources: { cpu: 35, memory: 48, storage: 5 },
          traffic: { current: 450, peak: 800, average: 600 },
          lastDeployment: '30 minutes ago',
          strategy: 'rolling',
          environment: 'staging',
          version: 'v1.5.2',
          createdAt: '2024-01-12T00:00:00Z',
          updatedAt: '2024-01-15T11:30:00Z'
        }
      ];
      
      setDeployments(mockDeployments);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load deployments:', error);
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      // Mock data - in real implementation, fetch from API
      const mockTemplates: DeploymentTemplate[] = [
        {
          id: '1',
          name: 'Static Website',
          description: 'React, Vue, or Angular static site with S3 and CloudFront',
          type: 'static',
          features: ['S3', 'CloudFront', 'SSL', 'CDN'],
          estimatedCost: 5,
          complexity: 'simple'
        },
        {
          id: '2',
          name: 'Container App',
          description: 'Dockerized application with ECS and ALB',
          type: 'container',
          features: ['ECS', 'ALB', 'VPC', 'RDS', 'Monitoring'],
          estimatedCost: 25,
          complexity: 'medium'
        },
        {
          id: '3',
          name: 'Kubernetes Cluster',
          description: 'Scalable Kubernetes cluster with EKS',
          type: 'kubernetes',
          features: ['EKS', 'VPC', 'RDS', 'ALB', 'Monitoring', 'Auto-scaling'],
          estimatedCost: 50,
          complexity: 'complex'
        },
        {
          id: '4',
          name: 'Serverless API',
          description: 'Lambda-based API with API Gateway',
          type: 'serverless',
          features: ['Lambda', 'API Gateway', 'DynamoDB', 'Monitoring'],
          estimatedCost: 10,
          complexity: 'simple'
        }
      ];
      
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleDeploymentAction = async (deploymentId: string, action: string) => {
    try {
      // In real implementation, call appropriate API endpoint
      console.log(`Performing ${action} on deployment ${deploymentId}`);
      
      // Update local state optimistically
      setDeployments(prev => prev.map(dep => 
        dep.id === deploymentId 
          ? { ...dep, status: action === 'start' ? 'running' : action === 'stop' ? 'stopped' : dep.status }
          : dep
      ));
    } catch (error) {
      console.error(`Failed to ${action} deployment:`, error);
    }
  };

  const handleScalingAction = async (deploymentId: string, replicas: number) => {
    try {
      // In real implementation, call scaling API
      console.log(`Scaling deployment ${deploymentId} to ${replicas} replicas`);
      
      setDeployments(prev => prev.map(dep => 
        dep.id === deploymentId 
          ? { ...dep, replicas: { ...dep.replicas, desired: replicas }, status: 'scaling' }
          : dep
      ));
    } catch (error) {
      console.error('Failed to scale deployment:', error);
    }
  };

  const handleDeleteDeployment = async (deploymentId: string) => {
    if (window.confirm('Are you sure you want to delete this deployment?')) {
      try {
        // In real implementation, call delete API
        console.log(`Deleting deployment ${deploymentId}`);
        
        setDeployments(prev => prev.filter(dep => dep.id !== deploymentId));
      } catch (error) {
        console.error('Failed to delete deployment:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'stopped':
        return <Pause className="h-4 w-4 text-gray-500" />;
      case 'deploying':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'scaling':
        return <Activity className="h-4 w-4 text-yellow-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'bg-green-500';
      case 'unhealthy':
        return 'bg-red-500';
      case 'degraded':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'complex':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deployment Management</h1>
          <p className="text-gray-600">Manage and monitor your deployments</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Deployment
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deployments</p>
                <p className="text-2xl font-bold">{deployments.length}</p>
              </div>
              <Server className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Running</p>
                <p className="text-2xl font-bold text-green-600">
                  {deployments.filter(d => d.status === 'running').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Replicas</p>
                <p className="text-2xl font-bold">
                  {deployments.reduce((sum, d) => sum + d.replicas.current, 0)}
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Environments</p>
                <p className="text-2xl font-bold">
                  {new Set(deployments.map(d => d.environment)).size}
                </p>
              </div>
              <Globe className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="deployments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Deployments Tab */}
        <TabsContent value="deployments" className="space-y-4">
          <div className="grid gap-4">
            {deployments.map((deployment) => (
              <Card key={deployment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(deployment.status)}
                      <div>
                        <CardTitle className="text-lg">{deployment.name}</CardTitle>
                        <CardDescription>
                          {deployment.strategy} • {deployment.environment} • v{deployment.version}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={deployment.health === 'healthy' ? 'default' : 'destructive'}>
                        {deployment.health}
                      </Badge>
                      <Badge variant="outline">
                        {deployment.environment}
                      </Badge>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeploymentAction(deployment.id, 'start')}
                          disabled={deployment.status === 'running'}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeploymentAction(deployment.id, 'stop')}
                          disabled={deployment.status === 'stopped'}
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeploymentAction(deployment.id, 'restart')}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDeployment(deployment.id)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteDeployment(deployment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Uptime</p>
                      <p className="text-lg font-semibold">{deployment.uptime}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Replicas</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-lg font-semibold">
                          {deployment.replicas.current}/{deployment.replicas.desired}
                        </p>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleScalingAction(deployment.id, Math.max(deployment.replicas.desired - 1, deployment.replicas.min))}
                            disabled={deployment.replicas.desired <= deployment.replicas.min}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleScalingAction(deployment.id, Math.min(deployment.replicas.desired + 1, deployment.replicas.max))}
                            disabled={deployment.replicas.desired >= deployment.replicas.max}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">CPU</p>
                      <p className="text-lg font-semibold">{deployment.resources.cpu}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Memory</p>
                      <p className="text-lg font-semibold">{deployment.resources.memory}%</p>
                    </div>
                  </div>
                  
                  {/* Resource Usage Bars */}
                  <div className="mt-4 space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CPU Usage</span>
                        <span>{deployment.resources.cpu}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${deployment.resources.cpu}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Usage</span>
                        <span>{deployment.resources.memory}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${deployment.resources.memory}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getComplexityColor(template.complexity)}>
                        {template.complexity}
                      </Badge>
                      <Badge variant="outline">
                        ${template.estimatedCost}/month
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Features</p>
                      <div className="flex flex-wrap gap-2">
                        {template.features.map((feature) => (
                          <Badge key={feature} variant="secondary">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm">
                        <Play className="h-3 w-3 mr-2" />
                        Deploy
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3 mr-2" />
                        Customize
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>System Overview</span>
              </CardTitle>
              <CardDescription>Real-time system metrics and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">99.9%</div>
                  <p className="text-sm text-gray-600">Overall Uptime</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">1.2k</div>
                  <p className="text-sm text-gray-600">Requests/min</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">180ms</div>
                  <p className="text-sm text-gray-600">Avg Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
