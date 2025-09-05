import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Settings, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Target
} from 'lucide-react';

interface ScalingConfig {
  hpa: {
    enabled: boolean;
    minReplicas: number;
    maxReplicas: number;
    targetCPUUtilization: number;
    targetMemoryUtilization: number;
    scaleUpStabilization: number;
    scaleDownStabilization: number;
  };
  vpa: {
    enabled: boolean;
    updateMode: 'Off' | 'Initial' | 'Auto';
    resourcePolicy: {
      cpu: { min: string; max: string };
      memory: { min: string; max: string };
    };
  };
  customMetrics: Array<{
    name: string;
    targetValue: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    enabled: boolean;
  }>;
}

interface ScalingRecommendation {
  type: 'scale-up' | 'scale-down' | 'no-change';
  reason: string;
  currentReplicas: number;
  recommendedReplicas: number;
  confidence: number;
  metrics: {
    cpu: number;
    memory: number;
    requests: number;
    responseTime: number;
  };
}

export function ScalingControls({ deploymentId }: { deploymentId: string }) {
  const [scalingConfig, setScalingConfig] = useState<ScalingConfig>({
    hpa: {
      enabled: true,
      minReplicas: 2,
      maxReplicas: 10,
      targetCPUUtilization: 70,
      targetMemoryUtilization: 80,
      scaleUpStabilization: 60,
      scaleDownStabilization: 300
    },
    vpa: {
      enabled: true,
      updateMode: 'Auto',
      resourcePolicy: {
        cpu: { min: '100m', max: '2' },
        memory: { min: '128Mi', max: '4Gi' }
      }
    },
    customMetrics: [
      {
        name: 'requests_per_second',
        targetValue: 100,
        scaleUpThreshold: 80,
        scaleDownThreshold: 20,
        enabled: true
      },
      {
        name: 'response_time',
        targetValue: 200,
        scaleUpThreshold: 150,
        scaleDownThreshold: 100,
        enabled: false
      }
    ]
  });

  const [recommendations, setRecommendations] = useState<ScalingRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState({
    cpu: 65,
    memory: 72,
    requests: 1200,
    responseTime: 180
  });

  useEffect(() => {
    loadScalingConfig();
    loadRecommendations();
    loadCurrentMetrics();
  }, [deploymentId]);

  const loadScalingConfig = async () => {
    try {
      // In real implementation, fetch from API
      console.log('Loading scaling config for deployment:', deploymentId);
    } catch (error) {
      console.error('Failed to load scaling config:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      // Mock recommendations - in real implementation, fetch from API
      const mockRecommendations: ScalingRecommendation[] = [
        {
          type: 'scale-up',
          reason: 'High CPU utilization (65%) approaching threshold (70%)',
          currentReplicas: 3,
          recommendedReplicas: 5,
          confidence: 85,
          metrics: {
            cpu: 65,
            memory: 72,
            requests: 1200,
            responseTime: 180
          }
        }
      ];
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const loadCurrentMetrics = async () => {
    try {
      // Mock metrics - in real implementation, fetch from API
      setCurrentMetrics({
        cpu: 65,
        memory: 72,
        requests: 1200,
        responseTime: 180
      });
    } catch (error) {
      console.error('Failed to load current metrics:', error);
    }
  };

  const updateScalingConfig = async (config: Partial<ScalingConfig>) => {
    setIsLoading(true);
    try {
      // In real implementation, call API to update scaling config
      console.log('Updating scaling config:', config);
      
      setScalingConfig(prev => ({ ...prev, ...config }));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to update scaling config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyRecommendation = async (recommendation: ScalingRecommendation) => {
    setIsLoading(true);
    try {
      // In real implementation, call API to apply recommendation
      console.log('Applying recommendation:', recommendation);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Remove applied recommendation
      setRecommendations(prev => prev.filter(r => r !== recommendation));
    } catch (error) {
      console.error('Failed to apply recommendation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'scale-up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'scale-down':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'scale-up':
        return 'border-green-200 bg-green-50';
      case 'scale-down':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Current Metrics</span>
          </CardTitle>
          <CardDescription>Real-time resource utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{currentMetrics.cpu}%</div>
              <p className="text-sm text-gray-600">CPU Usage</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{currentMetrics.memory}%</div>
              <p className="text-sm text-gray-600">Memory Usage</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{currentMetrics.requests}/s</div>
              <p className="text-sm text-gray-600">Requests/sec</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{currentMetrics.responseTime}ms</div>
              <p className="text-sm text-gray-600">Response Time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scaling Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Scaling Recommendations</span>
            </CardTitle>
            <CardDescription>AI-powered scaling suggestions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getRecommendationColor(recommendation.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getRecommendationIcon(recommendation.type)}
                    <div>
                      <p className="font-medium">{recommendation.reason}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Current: {recommendation.currentReplicas} replicas → 
                        Recommended: {recommendation.recommendedReplicas} replicas
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Confidence: {recommendation.confidence}%</span>
                        <span>CPU: {recommendation.metrics.cpu}%</span>
                        <span>Memory: {recommendation.metrics.memory}%</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => applyRecommendation(recommendation)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Clock className="h-3 w-3 mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* HPA Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Horizontal Pod Autoscaler (HPA)</span>
          </CardTitle>
          <CardDescription>Configure automatic horizontal scaling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable HPA</p>
              <p className="text-sm text-gray-600">Automatically scale pods based on metrics</p>
            </div>
            <Switch
              checked={scalingConfig.hpa.enabled}
              onCheckedChange={(enabled) => 
                updateScalingConfig({ hpa: { ...scalingConfig.hpa, enabled } })
              }
            />
          </div>

          {scalingConfig.hpa.enabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Min Replicas</label>
                  <Slider
                    value={[scalingConfig.hpa.minReplicas]}
                    onValueChange={([value]) => 
                      updateScalingConfig({ hpa: { ...scalingConfig.hpa, minReplicas: value } })
                    }
                    min={1}
                    max={20}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">{scalingConfig.hpa.minReplicas} replicas</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Max Replicas</label>
                  <Slider
                    value={[scalingConfig.hpa.maxReplicas]}
                    onValueChange={([value]) => 
                      updateScalingConfig({ hpa: { ...scalingConfig.hpa, maxReplicas: value } })
                    }
                    min={scalingConfig.hpa.minReplicas}
                    max={50}
                    step={1}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">{scalingConfig.hpa.maxReplicas} replicas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Target CPU Utilization</label>
                  <Slider
                    value={[scalingConfig.hpa.targetCPUUtilization]}
                    onValueChange={([value]) => 
                      updateScalingConfig({ hpa: { ...scalingConfig.hpa, targetCPUUtilization: value } })
                    }
                    min={10}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">{scalingConfig.hpa.targetCPUUtilization}%</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Target Memory Utilization</label>
                  <Slider
                    value={[scalingConfig.hpa.targetMemoryUtilization]}
                    onValueChange={([value]) => 
                      updateScalingConfig({ hpa: { ...scalingConfig.hpa, targetMemoryUtilization: value } })
                    }
                    min={10}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">{scalingConfig.hpa.targetMemoryUtilization}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Scale Up Stabilization (seconds)</label>
                  <Slider
                    value={[scalingConfig.hpa.scaleUpStabilization]}
                    onValueChange={([value]) => 
                      updateScalingConfig({ hpa: { ...scalingConfig.hpa, scaleUpStabilization: value } })
                    }
                    min={0}
                    max={300}
                    step={10}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">{scalingConfig.hpa.scaleUpStabilization}s</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Scale Down Stabilization (seconds)</label>
                  <Slider
                    value={[scalingConfig.hpa.scaleDownStabilization]}
                    onValueChange={([value]) => 
                      updateScalingConfig({ hpa: { ...scalingConfig.hpa, scaleDownStabilization: value } })
                    }
                    min={0}
                    max={600}
                    step={10}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">{scalingConfig.hpa.scaleDownStabilization}s</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* VPA Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Vertical Pod Autoscaler (VPA)</span>
          </CardTitle>
          <CardDescription>Configure automatic vertical scaling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable VPA</p>
              <p className="text-sm text-gray-600">Automatically adjust resource requests</p>
            </div>
            <Switch
              checked={scalingConfig.vpa.enabled}
              onCheckedChange={(enabled) => 
                updateScalingConfig({ vpa: { ...scalingConfig.vpa, enabled } })
              }
            />
          </div>

          {scalingConfig.vpa.enabled && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Update Mode</label>
                <div className="flex space-x-2 mt-2">
                  {['Off', 'Initial', 'Auto'].map((mode) => (
                    <Button
                      key={mode}
                      variant={scalingConfig.vpa.updateMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => 
                        updateScalingConfig({ 
                          vpa: { ...scalingConfig.vpa, updateMode: mode as any } 
                        })
                      }
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">CPU Resource Policy</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <input
                        type="text"
                        value={scalingConfig.vpa.resourcePolicy.cpu.min}
                        onChange={(e) => 
                          updateScalingConfig({
                            vpa: {
                              ...scalingConfig.vpa,
                              resourcePolicy: {
                                ...scalingConfig.vpa.resourcePolicy,
                                cpu: { ...scalingConfig.vpa.resourcePolicy.cpu, min: e.target.value }
                              }
                            }
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Min CPU"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={scalingConfig.vpa.resourcePolicy.cpu.max}
                        onChange={(e) => 
                          updateScalingConfig({
                            vpa: {
                              ...scalingConfig.vpa,
                              resourcePolicy: {
                                ...scalingConfig.vpa.resourcePolicy,
                                cpu: { ...scalingConfig.vpa.resourcePolicy.cpu, max: e.target.value }
                              }
                            }
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Max CPU"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Memory Resource Policy</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <input
                        type="text"
                        value={scalingConfig.vpa.resourcePolicy.memory.min}
                        onChange={(e) => 
                          updateScalingConfig({
                            vpa: {
                              ...scalingConfig.vpa,
                              resourcePolicy: {
                                ...scalingConfig.vpa.resourcePolicy,
                                memory: { ...scalingConfig.vpa.resourcePolicy.memory, min: e.target.value }
                              }
                            }
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Min Memory"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={scalingConfig.vpa.resourcePolicy.memory.max}
                        onChange={(e) => 
                          updateScalingConfig({
                            vpa: {
                              ...scalingConfig.vpa,
                              resourcePolicy: {
                                ...scalingConfig.vpa.resourcePolicy,
                                memory: { ...scalingConfig.vpa.resourcePolicy.memory, max: e.target.value }
                              }
                            }
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Max Memory"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Custom Metrics</span>
          </CardTitle>
          <CardDescription>Configure custom scaling metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scalingConfig.customMetrics.map((metric, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">{metric.name}</p>
                  <p className="text-sm text-gray-600">Custom scaling metric</p>
                </div>
                <Switch
                  checked={metric.enabled}
                  onCheckedChange={(enabled) => {
                    const updatedMetrics = [...scalingConfig.customMetrics];
                    updatedMetrics[index] = { ...metric, enabled };
                    updateScalingConfig({ customMetrics: updatedMetrics });
                  }}
                />
              </div>

              {metric.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Target Value</label>
                    <input
                      type="number"
                      value={metric.targetValue}
                      onChange={(e) => {
                        const updatedMetrics = [...scalingConfig.customMetrics];
                        updatedMetrics[index] = { ...metric, targetValue: Number(e.target.value) };
                        updateScalingConfig({ customMetrics: updatedMetrics });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Scale Up Threshold</label>
                    <input
                      type="number"
                      value={metric.scaleUpThreshold}
                      onChange={(e) => {
                        const updatedMetrics = [...scalingConfig.customMetrics];
                        updatedMetrics[index] = { ...metric, scaleUpThreshold: Number(e.target.value) };
                        updateScalingConfig({ customMetrics: updatedMetrics });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Scale Down Threshold</label>
                    <input
                      type="number"
                      value={metric.scaleDownThreshold}
                      onChange={(e) => {
                        const updatedMetrics = [...scalingConfig.customMetrics];
                        updatedMetrics[index] = { ...metric, scaleDownThreshold: Number(e.target.value) };
                        updateScalingConfig({ customMetrics: updatedMetrics });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
