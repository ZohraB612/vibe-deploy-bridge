import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit3, Trash2, Eye, EyeOff, Settings, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  environment: "development" | "staging" | "production";
  lastModified: Date;
}

interface EnvironmentVariablesProps {
  projectId: string;
}

export function EnvironmentVariables({ projectId }: EnvironmentVariablesProps) {
  const [variables, setVariables] = useState<EnvironmentVariable[]>([
    {
      id: "1",
      key: "DATABASE_URL",
      value: "postgresql://user:pass@localhost:5432/db",
      isSecret: true,
      environment: "production",
      lastModified: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: "2",
      key: "NODE_ENV",
      value: "production",
      isSecret: false,
      environment: "production",
      lastModified: new Date(Date.now() - 48 * 60 * 60 * 1000)
    },
    {
      id: "3",
      key: "API_KEY",
      value: "sk-1234567890abcdef",
      isSecret: true,
      environment: "development",
      lastModified: new Date()
    }
  ]);

  const [newVariable, setNewVariable] = useState({
    key: "",
    value: "",
    isSecret: false,
    environment: "development" as const
  });

  const [editingVariable, setEditingVariable] = useState<EnvironmentVariable | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { toast } = useToast();

  const handleAddVariable = () => {
    if (!newVariable.key.trim() || !newVariable.value.trim()) {
      toast({
        title: "Validation Error",
        description: "Key and value are required",
        variant: "destructive"
      });
      return;
    }

    const variable: EnvironmentVariable = {
      id: Date.now().toString(),
      ...newVariable,
      lastModified: new Date()
    };

    setVariables(prev => [...prev, variable]);
    setNewVariable({ key: "", value: "", isSecret: false, environment: "development" });
    setIsAddDialogOpen(false);

    toast({
      title: "Variable added",
      description: `${variable.key} has been added to ${variable.environment}`
    });
  };

  const handleEditVariable = () => {
    if (!editingVariable) return;

    setVariables(prev => prev.map(v => 
      v.id === editingVariable.id 
        ? { ...editingVariable, lastModified: new Date() }
        : v
    ));
    setEditingVariable(null);
    setIsEditDialogOpen(false);

    toast({
      title: "Variable updated",
      description: `${editingVariable.key} has been updated`
    });
  };

  const handleDeleteVariable = (id: string) => {
    const variable = variables.find(v => v.id === id);
    setVariables(prev => prev.filter(v => v.id !== id));
    
    toast({
      title: "Variable deleted",
      description: `${variable?.key} has been removed`
    });
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case "production":
        return "bg-destructive text-destructive-foreground";
      case "staging":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-success text-success-foreground";
    }
  };

  const maskValue = (value: string) => {
    return "•".repeat(Math.min(value.length, 20));
  };

  const groupedVariables = variables.reduce((acc, variable) => {
    if (!acc[variable.environment]) {
      acc[variable.environment] = [];
    }
    acc[variable.environment].push(variable);
    return acc;
  }, {} as Record<string, EnvironmentVariable[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Environment Variables</CardTitle>
            <Badge variant="outline" className="text-xs">
              {variables.length} variables
            </Badge>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-3 w-3 mr-1" />
                Add Variable
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Environment Variable</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="key">Key</Label>
                  <Input
                    id="key"
                    placeholder="VARIABLE_NAME"
                    value={newVariable.key}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div>
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    placeholder="Variable value"
                    type={newVariable.isSecret ? "password" : "text"}
                    value={newVariable.value}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, value: e.target.value }))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isSecret"
                    checked={newVariable.isSecret}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, isSecret: e.target.checked }))}
                    className="rounded border-input"
                  />
                  <Label htmlFor="isSecret">Mark as secret</Label>
                </div>
                <div>
                  <Label htmlFor="environment">Environment</Label>
                  <select
                    id="environment"
                    value={newVariable.environment}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, environment: e.target.value as any }))}
                    className="w-full p-2 border rounded-md bg-background"
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddVariable}>
                    Add Variable
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedVariables).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No environment variables configured</p>
            <p className="text-sm">Add your first variable to get started</p>
          </div>
        ) : (
          Object.entries(groupedVariables).map(([environment, envVariables]) => (
            <div key={environment} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={getEnvironmentColor(environment)}>
                  {environment}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {envVariables.length} variables
                </span>
              </div>
              
              <div className="space-y-2">
                {envVariables.map((variable) => (
                  <div key={variable.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm font-mono font-semibold text-foreground">
                          {variable.key}
                        </code>
                        {variable.isSecret && (
                          <Badge variant="outline" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Secret
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-muted-foreground truncate">
                          {variable.isSecret && !showSecrets[variable.id]
                            ? maskValue(variable.value)
                            : variable.value
                          }
                        </code>
                        {variable.isSecret && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSecretVisibility(variable.id)}
                            className="h-6 w-6 p-0"
                          >
                            {showSecrets[variable.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last modified: {variable.lastModified.toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingVariable(variable)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Environment Variable</DialogTitle>
                          </DialogHeader>
                          {editingVariable && (
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="editKey">Key</Label>
                                <Input
                                  id="editKey"
                                  value={editingVariable.key}
                                  onChange={(e) => setEditingVariable(prev => 
                                    prev ? { ...prev, key: e.target.value.toUpperCase() } : null
                                  )}
                                />
                              </div>
                              <div>
                                <Label htmlFor="editValue">Value</Label>
                                <Input
                                  id="editValue"
                                  type={editingVariable.isSecret ? "password" : "text"}
                                  value={editingVariable.value}
                                  onChange={(e) => setEditingVariable(prev => 
                                    prev ? { ...prev, value: e.target.value } : null
                                  )}
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="editIsSecret"
                                  checked={editingVariable.isSecret}
                                  onChange={(e) => setEditingVariable(prev => 
                                    prev ? { ...prev, isSecret: e.target.checked } : null
                                  )}
                                  className="rounded border-input"
                                />
                                <Label htmlFor="editIsSecret">Mark as secret</Label>
                              </div>
                              <div>
                                <Label htmlFor="editEnvironment">Environment</Label>
                                <select
                                  id="editEnvironment"
                                  value={editingVariable.environment}
                                  onChange={(e) => setEditingVariable(prev => 
                                    prev ? { ...prev, environment: e.target.value as any } : null
                                  )}
                                  className="w-full p-2 border rounded-md bg-background"
                                >
                                  <option value="development">Development</option>
                                  <option value="staging">Staging</option>
                                  <option value="production">Production</option>
                                </select>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleEditVariable}>
                                  Update Variable
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Variable</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{variable.key}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteVariable(variable.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
              
              {environment !== Object.keys(groupedVariables)[Object.keys(groupedVariables).length - 1] && (
                <Separator className="mt-4" />
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}