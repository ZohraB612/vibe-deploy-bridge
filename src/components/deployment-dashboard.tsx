import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
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
  Minus
} from 'lucide-react';

interface DeploymentStatus {
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
}

interface ScalingMetrics {
  cpu: {
    current: number;
    average: number;
    peak: number;
    threshold: number;
  };
  memory: {
    current: number;
    average: number;
    peak: number;
    threshold: number;
  };
  requests: {
    current: number;
    average: number;
    peak: number;
  };
  responseTime: {
    current: number;
    average: number;
    p95: number;
    p99: number;
  };
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'acknowledged';
}

export function DeploymentDashboard() {
  const [deployments, setDeployments] = useState<DeploymentStatus[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);
  const [scalingMetrics, setScalingMetrics] = useState<ScalingMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDeployments();
    loadScalingMetrics();
    loadAlerts();
    
    // Set up real-time updates
    const interval = setInterval(() => {
      loadDeployments();
      loadScalingMetrics();
      loadAlerts();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadDeployments = async () => {
    try {
      // Mock data - in real implementation, fetch from API
      const mockDeployments: DeploymentStatus[] = [
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
          strategy: 'blue-green'
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
          strategy: 'canary'
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
          strategy: 'rolling'
        }
      ];
      
      setDeployments(mockDeployments);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load deployments:', error);
      setIsLoading(false);
    }
  };

  const loadScalingMetrics = async () => {
    try {
      // Mock data - in real implementation, fetch from API
      const mockMetrics: ScalingMetrics = {
        cpu: { current: 65, average: 58, peak: 85, threshold: 70 },
        memory: { current: 72, average: 68, peak: 90, threshold: 80 },
        requests: { current: 1200, average: 980, peak: 2100 },
        responseTime: { current: 250, average: 180, p95: 400, p99: 800 }
      };
      
      setScalingMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load scaling metrics:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      // Mock data - in real implementation, fetch from API
      const mockAlerts: Alert[] = [
        {
          id: '1',
          severity: 'high',
          message: 'High CPU utilization detected on api-gateway',
          timestamp: '5 minutes ago',
          status: 'active'
        },
        {
          id: '2',
          severity: 'medium',
          message: 'Memory usage approaching threshold on user-service',
          timestamp: '15 minutes ago',
          status: 'acknowledged'
        },
        {
          id: '3',
          severity: 'low',
          message: 'Deployment completed successfully for react-ecommerce',
          timestamp: '2 hours ago',
          status: 'resolved'
        }
      ];
      
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
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
          <h1 className="text-3xl font-bold">Deployment Dashboard</h1>
          <p className="text-gray-600">Monitor and manage your deployments</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm">
            <Play className="h-4 w-4 mr-2" />
            New Deployment
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
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
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">
                  {alerts.filter(a => a.status === 'active').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="deployments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="scaling">Scaling</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
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
                          {deployment.strategy} • Last deployed {deployment.lastDeployment}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={deployment.health === 'healthy' ? 'default' : 'destructive'}>
                        {deployment.health}
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
                      <p className="text-lg font-semibold">
                        {deployment.replicas.current}/{deployment.replicas.desired}
                      </p>
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
                      <Progress value={deployment.resources.cpu} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Usage</span>
                        <span>{deployment.resources.memory}%</span>
                      </div>
                      <Progress value={deployment.resources.memory} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Scaling Tab */}
        <TabsContent value="scaling" className="space-y-4">
          {scalingMetrics && (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Scaling Metrics</CardTitle>
                  <CardDescription>Current resource utilization and scaling recommendations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">CPU Utilization</span>
                        <span className="text-sm text-gray-600">
                          {scalingMetrics.cpu.current}% / {scalingMetrics.cpu.threshold}%
                        </span>
                      </div>
                      <Progress value={scalingMetrics.cpu.current} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Avg: {scalingMetrics.cpu.average}%</span>
                        <span>Peak: {scalingMetrics.cpu.peak}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Memory Utilization</span>
                        <span className="text-sm text-gray-600">
                          {scalingMetrics.memory.current}% / {scalingMetrics.memory.threshold}%
                        </span>
                      </div>
                      <Progress value={scalingMetrics.memory.current} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Avg: {scalingMetrics.memory.average}%</span>
                        <span>Peak: {scalingMetrics.memory.peak}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Request Rate</p>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-lg font-semibold">{scalingMetrics.requests.current}/s</span>
                        <span className="text-sm text-gray-600">
                          (Peak: {scalingMetrics.requests.peak}/s)
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Response Time</p>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-lg font-semibold">{scalingMetrics.responseTime.current}ms</span>
                        <span className="text-sm text-gray-600">
                          (P95: {scalingMetrics.responseTime.p95}ms)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
                <CardDescription>Real-time system metrics and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">99.9%</div>
                    <p className="text-sm text-gray-600">Uptime</p>
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
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)} mt-1`} />
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-gray-600">{alert.timestamp}</p>
                      </div>
                    </div>
                    <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'}>
                      {alert.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
