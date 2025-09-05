import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Activity, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  Database,
  Globe,
  Zap,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';

interface MetricData {
  timestamp: string;
  value: number;
  label?: string;
}

interface ChartData {
  name: string;
  data: MetricData[];
  color: string;
  type: 'line' | 'bar' | 'area';
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  traceId?: string;
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'active' | 'resolved' | 'acknowledged';
  timestamp: string;
  source: string;
  metrics: {
    threshold: number;
    current: number;
    unit: string;
  };
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastCheck: string;
}

export function MonitoringDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth[]>([]);

  useEffect(() => {
    loadMonitoringData();
    
    // Set up real-time updates
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const loadMonitoringData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadChartData(),
        loadLogs(),
        loadAlerts(),
        loadServiceHealth()
      ]);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChartData = async () => {
    // Mock data - in real implementation, fetch from API
    const mockChartData: ChartData[] = [
      {
        name: 'CPU Usage',
        color: '#3B82F6',
        type: 'line',
        data: generateMockTimeSeriesData(60, 20, 80)
      },
      {
        name: 'Memory Usage',
        color: '#10B981',
        type: 'line',
        data: generateMockTimeSeriesData(60, 30, 90)
      },
      {
        name: 'Request Rate',
        color: '#F59E0B',
        type: 'area',
        data: generateMockTimeSeriesData(60, 100, 2000)
      },
      {
        name: 'Response Time',
        color: '#EF4444',
        type: 'line',
        data: generateMockTimeSeriesData(60, 50, 500)
      }
    ];
    setChartData(mockChartData);
  };

  const loadLogs = async () => {
    // Mock data - in real implementation, fetch from API
    const mockLogs: LogEntry[] = [
      {
        timestamp: '2024-01-15T10:30:00Z',
        level: 'info',
        message: 'User authentication successful',
        source: 'auth-service',
        traceId: 'trace-123'
      },
      {
        timestamp: '2024-01-15T10:29:45Z',
        level: 'warn',
        message: 'High memory usage detected',
        source: 'api-gateway',
        traceId: 'trace-124'
      },
      {
        timestamp: '2024-01-15T10:29:30Z',
        level: 'error',
        message: 'Database connection timeout',
        source: 'user-service',
        traceId: 'trace-125'
      },
      {
        timestamp: '2024-01-15T10:29:15Z',
        level: 'debug',
        message: 'Cache hit for user profile',
        source: 'cache-service',
        traceId: 'trace-126'
      }
    ];
    setLogs(mockLogs);
  };

  const loadAlerts = async () => {
    // Mock data - in real implementation, fetch from API
    const mockAlerts: Alert[] = [
      {
        id: '1',
        severity: 'high',
        title: 'High CPU Utilization',
        description: 'CPU usage has exceeded 80% for more than 5 minutes',
        status: 'active',
        timestamp: '2024-01-15T10:25:00Z',
        source: 'api-gateway',
        metrics: {
          threshold: 80,
          current: 85,
          unit: '%'
        }
      },
      {
        id: '2',
        severity: 'medium',
        title: 'Memory Usage Warning',
        description: 'Memory usage is approaching the threshold',
        status: 'acknowledged',
        timestamp: '2024-01-15T10:20:00Z',
        source: 'user-service',
        metrics: {
          threshold: 90,
          current: 75,
          unit: '%'
        }
      },
      {
        id: '3',
        severity: 'low',
        title: 'Deployment Completed',
        description: 'New version deployed successfully',
        status: 'resolved',
        timestamp: '2024-01-15T10:15:00Z',
        source: 'deployment-service',
        metrics: {
          threshold: 0,
          current: 0,
          unit: ''
        }
      }
    ];
    setAlerts(mockAlerts);
  };

  const loadServiceHealth = async () => {
    // Mock data - in real implementation, fetch from API
    const mockServiceHealth: ServiceHealth[] = [
      {
        name: 'API Gateway',
        status: 'healthy',
        uptime: 99.9,
        responseTime: 120,
        errorRate: 0.1,
        lastCheck: '2024-01-15T10:30:00Z'
      },
      {
        name: 'User Service',
        status: 'degraded',
        uptime: 98.5,
        responseTime: 250,
        errorRate: 2.3,
        lastCheck: '2024-01-15T10:30:00Z'
      },
      {
        name: 'Database',
        status: 'healthy',
        uptime: 99.8,
        responseTime: 45,
        errorRate: 0.05,
        lastCheck: '2024-01-15T10:30:00Z'
      },
      {
        name: 'Cache Service',
        status: 'unhealthy',
        uptime: 95.2,
        responseTime: 500,
        errorRate: 5.8,
        lastCheck: '2024-01-15T10:30:00Z'
      }
    ];
    setServiceHealth(mockServiceHealth);
  };

  const generateMockTimeSeriesData = (points: number, min: number, max: number): MetricData[] => {
    const data: MetricData[] = [];
    const now = new Date();
    
    for (let i = points; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60000); // 1 minute intervals
      const value = Math.random() * (max - min) + min;
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(value * 100) / 100
      });
    }
    
    return data;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'debug':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
          <p className="text-gray-600">Real-time system monitoring and observability</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadMonitoringData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Service Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {serviceHealth.map((service) => (
          <Card key={service.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{service.name}</h3>
                <div className={`w-3 h-3 rounded-full ${
                  service.status === 'healthy' ? 'bg-green-500' :
                  service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Uptime:</span>
                  <span className={getStatusColor(service.status)}>{service.uptime}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Response:</span>
                  <span>{service.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Errors:</span>
                  <span className={service.errorRate > 1 ? 'text-red-600' : 'text-green-600'}>
                    {service.errorRate}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="traces">Traces</TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4">
            {chartData.map((chart) => (
              <Card key={chart.name}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>{chart.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: chart.color }}>
                        {chart.data[chart.data.length - 1]?.value || 0}
                        {chart.name.includes('Usage') ? '%' : 
                         chart.name.includes('Rate') ? '/s' : 
                         chart.name.includes('Time') ? 'ms' : ''}
                      </div>
                      <p className="text-sm text-gray-600">Current Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Application Logs</span>
              </CardTitle>
              <CardDescription>Real-time log streaming and analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getLevelColor(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">{log.source}</span>
                        {log.traceId && (
                          <span className="text-xs text-gray-500">#{log.traceId}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{log.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
                        <h3 className="font-medium">{alert.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Source: {alert.source}</span>
                          <span>
                            {alert.metrics.current}{alert.metrics.unit} / {alert.metrics.threshold}{alert.metrics.unit}
                          </span>
                          <span>{formatTimestamp(alert.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={alert.status === 'active' ? 'destructive' : 'secondary'}>
                        {alert.status}
                      </Badge>
                      {alert.status === 'active' && (
                        <Button size="sm" variant="outline">
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Traces Tab */}
        <TabsContent value="traces" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Distributed Tracing</span>
              </CardTitle>
              <CardDescription>Request tracing and performance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Tracing data will be displayed here</p>
                <p className="text-sm text-gray-500 mt-2">
                  Configure tracing in your application to see request flows
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
