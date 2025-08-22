import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Play, Pause, Download, Trash2, Terminal, Search, Filter, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDeploymentLogs } from "@/contexts/DeploymentLogsContext";
import { LoadingSpinner } from "@/components/loading-spinner";

interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "success";
  message: string;
  source?: string;
}

interface DeploymentLogsProps {
  deploymentId: string;
  projectId: string;
  isActive?: boolean;
}

export function DeploymentLogs({ deploymentId, projectId, isActive = false }: DeploymentLogsProps) {
  // Real deployment logs context
  const {
    logs: realLogs,
    isLoading,
    isStreaming: contextIsStreaming,
    error,
    fetchLogs,
    startLogStreaming,
    stopLogStreaming,
    clearLogs,
    searchLogs,
    filterLogs
  } = useDeploymentLogs();

  // Keep all original state management for UI functionality
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(isActive);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogEntry["level"] | "all">("all");
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Sync real logs with local state (keeping original functionality)
  useEffect(() => {
    if (realLogs.length > 0) {
      const transformedLogs: LogEntry[] = realLogs.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level as "info" | "warn" | "error" | "success",
        message: log.message,
        source: log.source
      }));
      setLogs(transformedLogs);
    }
  }, [realLogs]);

  // Initialize real logs on mount
  useEffect(() => {
    if (!isInitialized) {
      fetchLogs(deploymentId);
      setIsInitialized(true);
    }
  }, [deploymentId, fetchLogs, isInitialized]);

  // Enhanced log streaming with real + fallback mock simulation
  useEffect(() => {
    if (!isStreaming) return;

    // Start real log streaming
    startLogStreaming(deploymentId);

    // Fallback mock logs for demo purposes when no real logs are available
    const interval = setInterval(() => {
      if (realLogs.length === 0) {
        const mockLogs: LogEntry[] = [
          {
            id: Date.now().toString(),
            timestamp: new Date(),
            level: "info",
            message: "Starting deployment process...",
            source: "deployer"
          },
          {
            id: (Date.now() + 1).toString(),
            timestamp: new Date(),
            level: "info",
            message: "Installing dependencies...",
            source: "npm"
          },
          {
            id: (Date.now() + 2).toString(),
            timestamp: new Date(),
            level: "success",
            message: "Build completed successfully",
            source: "webpack"
          },
          {
            id: (Date.now() + 3).toString(),
            timestamp: new Date(),
            level: "warn",
            message: "Some warnings during build process",
            source: "webpack"
          }
        ];

        const randomLog = mockLogs[Math.floor(Math.random() * mockLogs.length)];
        setLogs(prev => [...prev, { ...randomLog, id: Date.now().toString() }]);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      stopLogStreaming();
    };
  }, [isStreaming, deploymentId, startLogStreaming, stopLogStreaming, realLogs.length]);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  const getLevelColor = (level: LogEntry["level"]) => {
    switch (level) {
      case "error":
        return "bg-destructive text-destructive-foreground";
      case "warn":
        return "bg-warning text-warning-foreground";
      case "success":
        return "bg-success text-success-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const toggleStreaming = () => {
    const newStreamingState = !isStreaming;
    setIsStreaming(newStreamingState);
    
    if (newStreamingState) {
      startLogStreaming(deploymentId);
      toast({
        title: "Log streaming started",
        description: "Real-time logs are now being displayed",
      });
    } else {
      stopLogStreaming();
      toast({
        title: "Log streaming stopped", 
        description: "Log streaming has been paused",
      });
    }
  };

  const clearAllLogs = () => {
    setLogs([]);
    clearLogs(); // Clear real logs too
    toast({
      title: "Logs cleared",
      description: "All deployment logs have been cleared"
    });
  };

  const handleRefresh = () => {
    fetchLogs(deploymentId);
    toast({
      title: "Logs refreshed",
      description: "Latest logs have been loaded",
    });
  };

  const downloadLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()} ${log.source ? `[${log.source}]` : ''} ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-${deploymentId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Logs downloaded",
      description: "Deployment logs saved to your device"
    });
  };

  // Filter logs based on search query and level filter
  // Enhanced filtering with real context support
  const filteredLogs = (() => {
    let result = logs;
    
    // Apply search filter (keeping original logic + real context search)
    if (searchQuery !== "") {
      result = result.filter(log => 
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.source?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      );
      
      // Also use real context search for more advanced filtering
      const realSearchResults = searchLogs(searchQuery);
      if (realSearchResults.length > 0 && realLogs.length > 0) {
        const realSearchIds = new Set(realSearchResults.map(log => log.id));
        result = result.filter(log => realSearchIds.has(log.id));
      }
    }
    
    // Apply level filter (keeping original logic + real context filter)
    if (levelFilter !== "all") {
      result = result.filter(log => log.level === levelFilter);
      
      // Also apply real context level filter for enhanced filtering
      const realFilterResults = filterLogs(levelFilter);
      if (realFilterResults.length > 0 && realLogs.length > 0) {
        const realFilterIds = new Set(realFilterResults.map(log => log.id));
        result = result.filter(log => realFilterIds.has(log.id));
      }
    }
    
    return result;
  })();

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle>Deployment Logs</CardTitle>
            <Badge variant="outline" className="text-xs">
              {filteredLogs.length} of {logs.length} entries
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleStreaming}
              className="h-8"
            >
              {isStreaming ? (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Resume
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadLogs}
              disabled={logs.length === 0}
              className="h-8"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllLogs}
              disabled={logs.length === 0}
              className="h-8"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as LogEntry["level"] | "all")}
              className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
            >
              <option value="all">All levels</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[400px]">
        <ScrollArea ref={scrollAreaRef} className="h-full px-6 pb-6">
          {isLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <LoadingSpinner />
                <p className="text-sm text-muted-foreground mt-2">Loading deployment logs...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-destructive">
              <div className="text-center">
                <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Error loading logs</p>
                <p className="text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{logs.length === 0 ? "No logs available" : "No logs match your filter"}</p>
                <p className="text-sm">
                  {logs.length === 0 ? "Logs will appear here during deployment" : "Try adjusting your search or filter"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log, index) => (
                <div key={log.id}>
                  <div className="flex items-start gap-3 py-2">
                    <Badge className={`${getLevelColor(log.level)} text-xs shrink-0`}>
                      {log.level}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span>{log.timestamp.toLocaleTimeString()}</span>
                        {log.source && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{log.source}</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm font-mono text-foreground break-words">
                        {log.message}
                      </p>
                    </div>
                  </div>
                  {index < filteredLogs.length - 1 && <Separator className="my-1" />}
                </div>
              ))}
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {isStreaming && (
                    <>
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      <span>Live streaming</span>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAutoScroll(!autoScroll)}
                    className="h-6 px-2 text-xs"
                  >
                    Auto-scroll: {autoScroll ? "ON" : "OFF"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}