import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Server, 
  Container, 
  Zap, 
  Activity, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService, ECSScaleRequest, K8sScaleRequest, LambdaScaleRequest, HPARequest, PolicyCreateRequest } from '@/services/api';

interface ScalingManagementProps {
  projectId?: string;
  className?: string;
}

export function ScalingManagement({ projectId = 'default-project', className }: ScalingManagementProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});

  // ECS Scaling State
  const [ecsScale, setEcsScale] = useState<ECSScaleRequest>({
    resource_id: projectId,
    target_capacity: 2,
    cluster_name: '',
    service_name: '',
    reason: 'Manual scaling via DeployHub'
  });

  // K8s Scaling State
  const [k8sScale, setK8sScale] = useState<K8sScaleRequest>({
    namespace: 'default',
    deployment_name: 'my-app',
    target_replicas: 3,
    reason: 'Manual scaling via DeployHub'
  });

  // Lambda Scaling State
  const [lambdaScale, setLambdaScale] = useState<LambdaScaleRequest>({
    function_name: 'my-function',
    target_capacity: 10,
    reason: 'Manual scaling via DeployHub'
  });

  // HPA State
  const [hpaConfig, setHpaConfig] = useState<HPARequest>({
    namespace: 'default',
    deployment_name: 'my-app',
    min_replicas: 1,
    max_replicas: 10,
    target_cpu: 70
  });

  // Policy State
  const [policyConfig, setPolicyConfig] = useState<PolicyCreateRequest>({
    resource_id: projectId,
    resource_type: 'ecs',
    min_capacity: 1,
    max_capacity: 10,
    target_cpu: 70,
    scale_out_cooldown: 300,
    scale_in_cooldown: 300
  });

  const handleApiCall = async (operation: string, apiCall: () => Promise<any>) => {
    setIsLoading(true);
    try {
      const result = await apiCall();
      setResults(prev => ({ ...prev, [operation]: result }));
      
      toast({
        title: "Operation completed",
        description: result.message || `${operation} completed successfully`,
        variant: result.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error(`${operation} failed:`, error);
      toast({
        title: "Operation failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Command copied successfully"
    });
  };

  const renderResult = (operation: string, result: any) => {
    if (!result) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            {operation} Result
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {result.message}
          </div>
          
          {result.data && (
            <div className="space-y-3">
              {/* Show helpful information for different scenarios */}
              {result.data.command && (
                <div>
                  <Label className="text-sm font-medium">Manual Command</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                      {result.data.command}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(result.data.command)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {result.data.required_permissions && (
                <div>
                  <Label className="text-sm font-medium">Required Permissions</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {result.data.required_permissions.map((permission: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.data.aws_cli_command && (
                <div>
                  <Label className="text-sm font-medium">AWS CLI Command</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                      {result.data.aws_cli_command}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(result.data.aws_cli_command)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {result.data.manifest && (
                <div>
                  <Label className="text-sm font-medium">Kubernetes Manifest</Label>
                  <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(result.data.manifest, null, 2)}
                  </pre>
                </div>
              )}

              {result.data.note && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{result.data.note}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Scaling Management</h2>
        <p className="text-muted-foreground">
          Manage auto-scaling for your deployments across different platforms
        </p>
      </div>

      <Tabs defaultValue="ecs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ecs" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            ECS
          </TabsTrigger>
          <TabsTrigger value="k8s" className="flex items-center gap-2">
            <Container className="h-4 w-4" />
            Kubernetes
          </TabsTrigger>
          <TabsTrigger value="lambda" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Lambda
          </TabsTrigger>
          <TabsTrigger value="hpa" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            HPA
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Policies
          </TabsTrigger>
        </TabsList>

        {/* ECS Scaling */}
        <TabsContent value="ecs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ECS Service Scaling</CardTitle>
              <CardDescription>
                Scale your ECS services up or down based on demand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ecs-cluster">Cluster Name</Label>
                  <Input
                    id="ecs-cluster"
                    placeholder="default-cluster"
                    value={ecsScale.cluster_name || ''}
                    onChange={(e) => setEcsScale(prev => ({ ...prev, cluster_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecs-service">Service Name</Label>
                  <Input
                    id="ecs-service"
                    placeholder="my-service"
                    value={ecsScale.service_name || ''}
                    onChange={(e) => setEcsScale(prev => ({ ...prev, service_name: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ecs-capacity">Target Capacity</Label>
                <Input
                  id="ecs-capacity"
                  type="number"
                  min="1"
                  value={ecsScale.target_capacity}
                  onChange={(e) => setEcsScale(prev => ({ ...prev, target_capacity: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ecs-reason">Reason</Label>
                <Input
                  id="ecs-reason"
                  value={ecsScale.reason}
                  onChange={(e) => setEcsScale(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <Button
                onClick={() => handleApiCall('ECS Scaling', () => apiService.scaleECSService(ecsScale))}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Server className="h-4 w-4 mr-2" />}
                Scale ECS Service
              </Button>
            </CardContent>
          </Card>

          {renderResult('ECS Scaling', results['ECS Scaling'])}
        </TabsContent>

        {/* Kubernetes Scaling */}
        <TabsContent value="k8s" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kubernetes Deployment Scaling</CardTitle>
              <CardDescription>
                Scale your Kubernetes deployments and manage replicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="k8s-namespace">Namespace</Label>
                  <Input
                    id="k8s-namespace"
                    value={k8sScale.namespace}
                    onChange={(e) => setK8sScale(prev => ({ ...prev, namespace: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="k8s-deployment">Deployment Name</Label>
                  <Input
                    id="k8s-deployment"
                    value={k8sScale.deployment_name}
                    onChange={(e) => setK8sScale(prev => ({ ...prev, deployment_name: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="k8s-replicas">Target Replicas</Label>
                <Input
                  id="k8s-replicas"
                  type="number"
                  min="0"
                  value={k8sScale.target_replicas || ''}
                  onChange={(e) => setK8sScale(prev => ({ 
                    ...prev, 
                    target_replicas: parseInt(e.target.value) || 0,
                    replicas: parseInt(e.target.value) || 0 // Set both for compatibility
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="k8s-reason">Reason</Label>
                <Input
                  id="k8s-reason"
                  value={k8sScale.reason}
                  onChange={(e) => setK8sScale(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <Button
                onClick={() => handleApiCall('K8s Scaling', () => apiService.scaleKubernetesDeployment(k8sScale))}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Container className="h-4 w-4 mr-2" />}
                Scale Kubernetes Deployment
              </Button>
            </CardContent>
          </Card>

          {renderResult('K8s Scaling', results['K8s Scaling'])}
        </TabsContent>

        {/* Lambda Scaling */}
        <TabsContent value="lambda" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lambda Function Scaling</CardTitle>
              <CardDescription>
                Configure Lambda function concurrency and scaling limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lambda-function">Function Name</Label>
                <Input
                  id="lambda-function"
                  value={lambdaScale.function_name}
                  onChange={(e) => setLambdaScale(prev => ({ ...prev, function_name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lambda-capacity">Target Capacity</Label>
                <Input
                  id="lambda-capacity"
                  type="number"
                  min="1"
                  value={lambdaScale.target_capacity}
                  onChange={(e) => setLambdaScale(prev => ({ ...prev, target_capacity: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lambda-reason">Reason</Label>
                <Input
                  id="lambda-reason"
                  value={lambdaScale.reason}
                  onChange={(e) => setLambdaScale(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <Button
                onClick={() => handleApiCall('Lambda Scaling', () => apiService.scaleLambdaFunction(lambdaScale))}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Scale Lambda Function
              </Button>
            </CardContent>
          </Card>

          {renderResult('Lambda Scaling', results['Lambda Scaling'])}
        </TabsContent>

        {/* HPA Setup */}
        <TabsContent value="hpa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Horizontal Pod Autoscaler</CardTitle>
              <CardDescription>
                Set up automatic scaling for Kubernetes deployments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hpa-namespace">Namespace</Label>
                  <Input
                    id="hpa-namespace"
                    value={hpaConfig.namespace}
                    onChange={(e) => setHpaConfig(prev => ({ ...prev, namespace: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hpa-deployment">Deployment Name</Label>
                  <Input
                    id="hpa-deployment"
                    value={hpaConfig.deployment_name}
                    onChange={(e) => setHpaConfig(prev => ({ ...prev, deployment_name: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hpa-min">Min Replicas</Label>
                  <Input
                    id="hpa-min"
                    type="number"
                    min="1"
                    value={hpaConfig.min_replicas || 1}
                    onChange={(e) => setHpaConfig(prev => ({ ...prev, min_replicas: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hpa-max">Max Replicas</Label>
                  <Input
                    id="hpa-max"
                    type="number"
                    min="1"
                    value={hpaConfig.max_replicas || 10}
                    onChange={(e) => setHpaConfig(prev => ({ ...prev, max_replicas: parseInt(e.target.value) || 10 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hpa-cpu">Target CPU %</Label>
                  <Input
                    id="hpa-cpu"
                    type="number"
                    min="1"
                    max="100"
                    value={hpaConfig.target_cpu || 70}
                    onChange={(e) => setHpaConfig(prev => ({ ...prev, target_cpu: parseInt(e.target.value) || 70 }))}
                  />
                </div>
              </div>

              <Button
                onClick={() => handleApiCall('HPA Setup', () => apiService.setupHPA(hpaConfig))}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
                Setup HPA
              </Button>
            </CardContent>
          </Card>

          {renderResult('HPA Setup', results['HPA Setup'])}
        </TabsContent>

        {/* Auto-scaling Policies */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Auto-scaling Policies</CardTitle>
              <CardDescription>
                Create and manage auto-scaling policies for your resources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policy-resource-id">Resource ID</Label>
                  <Input
                    id="policy-resource-id"
                    value={policyConfig.resource_id}
                    onChange={(e) => setPolicyConfig(prev => ({ ...prev, resource_id: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policy-resource-type">Resource Type</Label>
                  <Select
                    value={policyConfig.resource_type}
                    onValueChange={(value) => setPolicyConfig(prev => ({ ...prev, resource_type: value as 'ecs' | 'lambda' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ecs">ECS</SelectItem>
                      <SelectItem value="lambda">Lambda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policy-min">Min Capacity</Label>
                  <Input
                    id="policy-min"
                    type="number"
                    min="1"
                    value={policyConfig.min_capacity || 1}
                    onChange={(e) => setPolicyConfig(prev => ({ ...prev, min_capacity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policy-max">Max Capacity</Label>
                  <Input
                    id="policy-max"
                    type="number"
                    min="1"
                    value={policyConfig.max_capacity || 10}
                    onChange={(e) => setPolicyConfig(prev => ({ ...prev, max_capacity: parseInt(e.target.value) || 10 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="policy-cpu">Target CPU %</Label>
                <Input
                  id="policy-cpu"
                  type="number"
                  min="1"
                  max="100"
                  value={policyConfig.target_cpu || 70}
                  onChange={(e) => setPolicyConfig(prev => ({ ...prev, target_cpu: parseInt(e.target.value) || 70 }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policy-scale-out">Scale Out Cooldown (seconds)</Label>
                  <Input
                    id="policy-scale-out"
                    type="number"
                    min="0"
                    value={policyConfig.scale_out_cooldown || 300}
                    onChange={(e) => setPolicyConfig(prev => ({ ...prev, scale_out_cooldown: parseInt(e.target.value) || 300 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policy-scale-in">Scale In Cooldown (seconds)</Label>
                  <Input
                    id="policy-scale-in"
                    type="number"
                    min="0"
                    value={policyConfig.scale_in_cooldown || 300}
                    onChange={(e) => setPolicyConfig(prev => ({ ...prev, scale_in_cooldown: parseInt(e.target.value) || 300 }))}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleApiCall('Policy Creation', () => 
                    apiService.createAutoscalingPolicy(
                      policyConfig.resource_id,
                      policyConfig.resource_type,
                      {
                        min_capacity: policyConfig.min_capacity,
                        max_capacity: policyConfig.max_capacity,
                        target_cpu: policyConfig.target_cpu,
                        scale_out_cooldown: policyConfig.scale_out_cooldown,
                        scale_in_cooldown: policyConfig.scale_in_cooldown
                      }
                    )
                  )}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
                  Create Policy
                </Button>
                
                <Button
                  onClick={() => handleApiCall('Policy Deletion', () => 
                    apiService.deleteAutoscalingPolicy(policyConfig.resource_id, policyConfig.resource_type)
                  )}
                  disabled={isLoading}
                  variant="outline"
                >
                  Delete Policy
                </Button>
              </div>
            </CardContent>
          </Card>

          {renderResult('Policy Creation', results['Policy Creation'])}
          {renderResult('Policy Deletion', results['Policy Deletion'])}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ScalingManagement;
