import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Play, Pause, Download, Trash2, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "success";
  message: string;
  source?: string;
}

interface DeploymentLogsProps {
  deploymentId: string;
  isActive?: boolean;
}

export function DeploymentLogs({ deploymentId, isActive = false }: DeploymentLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(isActive);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Mock log streaming simulation
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
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
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming]);

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
    setIsStreaming(!isStreaming);
    toast({
      title: isStreaming ? "Logs paused" : "Logs resumed",
      description: isStreaming ? "Real-time streaming stopped" : "Real-time streaming started"
    });
  };

  const clearLogs = () => {
    setLogs([]);
    toast({
      title: "Logs cleared",
      description: "All deployment logs have been cleared"
    });
  };

  const downloadLogs = () => {
    const logText = logs.map(log => 
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

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <CardTitle>Deployment Logs</CardTitle>
            <Badge variant="outline" className="text-xs">
              {logs.length} entries
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
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="h-8"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[400px]">
        <ScrollArea ref={scrollAreaRef} className="h-full px-6 pb-6">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No logs available</p>
                <p className="text-sm">Logs will appear here during deployment</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => (
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
                  {index < logs.length - 1 && <Separator className="my-1" />}
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