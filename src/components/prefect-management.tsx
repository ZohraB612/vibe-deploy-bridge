import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Workflow, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Settings,
  CheckCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  Clock,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService, PrefectFlowRequest } from '@/services/api';

interface Task {
  name: string;
  type: string;
  config: Record<string, any>;
  dependencies: string[];
}

interface PrefectManagementProps {
  className?: string;
}

export function PrefectManagement({ className }: PrefectManagementProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});

  // Flow configuration state
  const [flowConfig, setFlowConfig] = useState<PrefectFlowRequest>({
    flow_name: '',
    tasks: [],
    schedule_type: 'manual',
    schedule_value: '',
    retries: 3,
    timeout: 3600
  });

  // Single task configuration (for simple flows)
  const [singleTask, setSingleTask] = useState({
    task_name: '',
    task_type: 'python',
    task_config: {} as Record<string, any>,
    dependencies: [] as string[]
  });

  // Task management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<Task>({
    name: '',
    type: 'python',
    config: {},
    dependencies: []
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

  const addTask = () => {
    if (newTask.name && newTask.type) {
      setTasks(prev => [...prev, { ...newTask }]);
      setNewTask({
        name: '',
        type: 'python',
        config: {},
        dependencies: []
      });
    }
  };

  const removeTask = (index: number) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const updateTaskConfig = (index: number, field: keyof Task, value: any) => {
    setTasks(prev => prev.map((task, i) => 
      i === index ? { ...task, [field]: value } : task
    ));
  };

  const createFlowFromTasks = () => {
    const flowData: PrefectFlowRequest = {
      flow_name: flowConfig.flow_name,
      tasks: tasks.length > 0 ? tasks : undefined,
      task_name: singleTask.task_name || undefined,
      task_type: singleTask.task_type || undefined,
      task_config: Object.keys(singleTask.task_config).length > 0 ? singleTask.task_config : undefined,
      dependencies: singleTask.dependencies.length > 0 ? singleTask.dependencies : undefined,
      schedule_type: flowConfig.schedule_type,
      schedule_value: flowConfig.schedule_value || undefined,
      retries: flowConfig.retries,
      timeout: flowConfig.timeout
    };

    return flowData;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Configuration copied successfully"
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
              {result.data.flow_id && (
                <div>
                  <Label className="text-sm font-medium">Flow ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                      {result.data.flow_id}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(result.data.flow_id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {result.data.schedule && (
                <div>
                  <Label className="text-sm font-medium">Schedule Configuration</Label>
                  <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(result.data.schedule, null, 2)}
                  </pre>
                </div>
              )}

              {result.data.tasks && (
                <div>
                  <Label className="text-sm font-medium">Tasks Configuration</Label>
                  <pre className="text-xs bg-muted p-3 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(result.data.tasks, null, 2)}
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
        <h2 className="text-2xl font-bold mb-2">Prefect Flow Management</h2>
        <p className="text-muted-foreground">
          Create and manage Prefect workflows for your deployments
        </p>
      </div>

      <Tabs defaultValue="simple" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Simple Flow
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced Flow
          </TabsTrigger>
        </TabsList>

        {/* Simple Flow Creation */}
        <TabsContent value="simple" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Simple Prefect Flow</CardTitle>
              <CardDescription>
                Create a single-task flow with basic configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flow-name">Flow Name *</Label>
                <Input
                  id="flow-name"
                  placeholder="my-workflow"
                  value={flowConfig.flow_name}
                  onChange={(e) => setFlowConfig(prev => ({ ...prev, flow_name: e.target.value }))}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Task Configuration</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-name">Task Name</Label>
                    <Input
                      id="task-name"
                      placeholder="my-task"
                      value={singleTask.task_name}
                      onChange={(e) => setSingleTask(prev => ({ ...prev, task_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-type">Task Type</Label>
                    <Select
                      value={singleTask.task_type}
                      onValueChange={(value) => setSingleTask(prev => ({ ...prev, task_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="python">Python Function</SelectItem>
                        <SelectItem value="shell">Shell Command</SelectItem>
                        <SelectItem value="docker">Docker Container</SelectItem>
                        <SelectItem value="kubernetes">Kubernetes Job</SelectItem>
                        <SelectItem value="aws-batch">AWS Batch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-config">Task Configuration (JSON)</Label>
                  <Textarea
                    id="task-config"
                    placeholder='{"script": "print(\"Hello World\")", "timeout": 300}'
                    value={JSON.stringify(singleTask.task_config, null, 2)}
                    onChange={(e) => {
                      try {
                        const config = JSON.parse(e.target.value);
                        setSingleTask(prev => ({ ...prev, task_config: config }));
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-dependencies">Dependencies (comma-separated)</Label>
                  <Input
                    id="task-dependencies"
                    placeholder="task1, task2"
                    value={singleTask.dependencies.join(', ')}
                    onChange={(e) => setSingleTask(prev => ({ 
                      ...prev, 
                      dependencies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Flow Settings</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-type">Schedule Type</Label>
                    <Select
                      value={flowConfig.schedule_type}
                      onValueChange={(value) => setFlowConfig(prev => ({ ...prev, schedule_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="cron">Cron</SelectItem>
                        <SelectItem value="interval">Interval</SelectItem>
                        <SelectItem value="rrule">RRule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schedule-value">Schedule Value</Label>
                    <Input
                      id="schedule-value"
                      placeholder="0 9 * * 1-5 (cron) or 3600 (interval seconds)"
                      value={flowConfig.schedule_value || ''}
                      onChange={(e) => setFlowConfig(prev => ({ ...prev, schedule_value: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retries">Retries</Label>
                    <Input
                      id="retries"
                      type="number"
                      min="0"
                      value={flowConfig.retries}
                      onChange={(e) => setFlowConfig(prev => ({ ...prev, retries: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="1"
                      value={flowConfig.timeout}
                      onChange={(e) => setFlowConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 3600 }))}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleApiCall('Prefect Flow Creation', () => 
                  apiService.createPrefectFlow(createFlowFromTasks())
                )}
                disabled={isLoading || !flowConfig.flow_name}
                className="w-full"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Workflow className="h-4 w-4 mr-2" />}
                Create Prefect Flow
              </Button>
            </CardContent>
          </Card>

          {renderResult('Prefect Flow Creation', results['Prefect Flow Creation'])}
        </TabsContent>

        {/* Advanced Flow Creation */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Advanced Prefect Flow</CardTitle>
              <CardDescription>
                Create a multi-task flow with complex dependencies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="advanced-flow-name">Flow Name *</Label>
                <Input
                  id="advanced-flow-name"
                  placeholder="my-complex-workflow"
                  value={flowConfig.flow_name}
                  onChange={(e) => setFlowConfig(prev => ({ ...prev, flow_name: e.target.value }))}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tasks</h4>
                
                {/* Add New Task */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Add New Task</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-task-name">Task Name</Label>
                        <Input
                          id="new-task-name"
                          placeholder="task-name"
                          value={newTask.name}
                          onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-task-type">Task Type</Label>
                        <Select
                          value={newTask.type}
                          onValueChange={(value) => setNewTask(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="python">Python Function</SelectItem>
                            <SelectItem value="shell">Shell Command</SelectItem>
                            <SelectItem value="docker">Docker Container</SelectItem>
                            <SelectItem value="kubernetes">Kubernetes Job</SelectItem>
                            <SelectItem value="aws-batch">AWS Batch</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-task-config">Task Configuration (JSON)</Label>
                      <Textarea
                        id="new-task-config"
                        placeholder='{"script": "print(\"Hello World\")", "timeout": 300}'
                        value={JSON.stringify(newTask.config, null, 2)}
                        onChange={(e) => {
                          try {
                            const config = JSON.parse(e.target.value);
                            setNewTask(prev => ({ ...prev, config }));
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-task-dependencies">Dependencies (comma-separated)</Label>
                      <Input
                        id="new-task-dependencies"
                        placeholder="task1, task2"
                        value={newTask.dependencies.join(', ')}
                        onChange={(e) => setNewTask(prev => ({ 
                          ...prev, 
                          dependencies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        }))}
                      />
                    </div>

                    <Button onClick={addTask} disabled={!newTask.name || !newTask.type} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </CardContent>
                </Card>

                {/* Task List */}
                {tasks.length > 0 && (
                  <div className="space-y-2">
                    <Label>Added Tasks ({tasks.length})</Label>
                    <div className="space-y-2">
                      {tasks.map((task, index) => (
                        <Card key={index}>
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{task.type}</Badge>
                                  <span className="font-medium">{task.name}</span>
                                </div>
                                {task.dependencies.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Depends on: {task.dependencies.join(', ')}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeTask(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Flow Settings</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advanced-schedule-type">Schedule Type</Label>
                    <Select
                      value={flowConfig.schedule_type}
                      onValueChange={(value) => setFlowConfig(prev => ({ ...prev, schedule_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="cron">Cron</SelectItem>
                        <SelectItem value="interval">Interval</SelectItem>
                        <SelectItem value="rrule">RRule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advanced-schedule-value">Schedule Value</Label>
                    <Input
                      id="advanced-schedule-value"
                      placeholder="0 9 * * 1-5 (cron) or 3600 (interval seconds)"
                      value={flowConfig.schedule_value || ''}
                      onChange={(e) => setFlowConfig(prev => ({ ...prev, schedule_value: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advanced-retries">Retries</Label>
                    <Input
                      id="advanced-retries"
                      type="number"
                      min="0"
                      value={flowConfig.retries}
                      onChange={(e) => setFlowConfig(prev => ({ ...prev, retries: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advanced-timeout">Timeout (seconds)</Label>
                    <Input
                      id="advanced-timeout"
                      type="number"
                      min="1"
                      value={flowConfig.timeout}
                      onChange={(e) => setFlowConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 3600 }))}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleApiCall('Advanced Prefect Flow Creation', () => 
                  apiService.createPrefectFlow(createFlowFromTasks())
                )}
                disabled={isLoading || !flowConfig.flow_name || tasks.length === 0}
                className="w-full"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Workflow className="h-4 w-4 mr-2" />}
                Create Advanced Flow
              </Button>
            </CardContent>
          </Card>

          {renderResult('Advanced Prefect Flow Creation', results['Advanced Prefect Flow Creation'])}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PrefectManagement;
