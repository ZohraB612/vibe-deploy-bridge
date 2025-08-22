import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import type { DeploymentLogInsert } from "@/lib/database.types";

export interface LogEntry {
  id: string;
  deploymentId: string;
  projectId: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'success';
  message: string;
  source: string;
  metadata?: any;
}

export interface DeploymentLogsContextType {
  logs: LogEntry[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  
  // Methods
  fetchLogs: (deploymentId: string) => Promise<void>;
  addLog: (deploymentId: string, projectId: string, level: LogEntry['level'], message: string, source: string, metadata?: any) => Promise<void>;
  startLogStreaming: (deploymentId: string) => void;
  stopLogStreaming: () => void;
  clearLogs: () => void;
  searchLogs: (query: string) => LogEntry[];
  filterLogs: (level: LogEntry['level'] | 'all') => LogEntry[];
}

const DeploymentLogsContext = createContext<DeploymentLogsContextType | undefined>(undefined);

export function useDeploymentLogs() {
  const context = useContext(DeploymentLogsContext);
  if (context === undefined) {
    throw new Error("useDeploymentLogs must be used within a DeploymentLogsProvider");
  }
  return context;
}

interface DeploymentLogsProviderProps {
  children: ReactNode;
}

export function DeploymentLogsProvider({ children }: DeploymentLogsProviderProps) {
  const { user, isAuthenticated } = useAuth();
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingInterval, setStreamingInterval] = useState<NodeJS.Timeout | null>(null);
  const [currentDeploymentId, setCurrentDeploymentId] = useState<string | null>(null);

  const transformLog = (dbLog: any): LogEntry => ({
    id: dbLog.id,
    deploymentId: dbLog.deployment_id,
    projectId: dbLog.project_id,
    timestamp: new Date(dbLog.timestamp),
    level: dbLog.log_level,
    message: dbLog.message,
    source: dbLog.source || 'system',
    metadata: dbLog.metadata
  });

  const fetchLogs = useCallback(async (deploymentId: string) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('deployment_logs')
        .select('*')
        .eq('deployment_id', deploymentId)
        .eq('user_id', user.id)
        .order('timestamp', { ascending: true });

      if (fetchError) throw fetchError;

      const transformedLogs = data.map(transformLog);
      setLogs(transformedLogs);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch logs";
      setError(errorMessage);
      console.error("Failed to fetch deployment logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addLog = useCallback(async (
    deploymentId: string,
    projectId: string,
    level: LogEntry['level'],
    message: string,
    source: string,
    metadata?: any
  ) => {
    if (!user) return;

    try {
      const logInsert: DeploymentLogInsert = {
        deployment_id: deploymentId,
        project_id: projectId,
        user_id: user.id,
        log_level: level,
        message,
        source,
        metadata,
        timestamp: new Date().toISOString()
      };

      const { data, error: insertError } = await supabase
        .from('deployment_logs')
        .insert(logInsert)
        .select()
        .single();

      if (insertError) throw insertError;

      const newLog = transformLog(data);
      setLogs(prev => [...prev, newLog]);
      
    } catch (err) {
      console.error("Failed to add log:", err);
    }
  }, [user]);

  const startLogStreaming = useCallback((deploymentId: string) => {
    if (streamingInterval) return; // Already streaming

    setIsStreaming(true);
    setCurrentDeploymentId(deploymentId);

    // Initial fetch
    fetchLogs(deploymentId);

    // Set up real-time subscription for new logs
    const subscription = supabase
      .channel(`deployment-logs-${deploymentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'deployment_logs',
        filter: `deployment_id=eq.${deploymentId}`
      }, (payload) => {
        const newLog = transformLog(payload.new);
        setLogs(prev => [...prev, newLog]);
      })
      .subscribe();

    // Also poll for updates every 2 seconds (backup to real-time)
    const interval = setInterval(() => {
      if (currentDeploymentId === deploymentId) {
        fetchLogs(deploymentId);
      }
    }, 2000);

    setStreamingInterval(interval);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [fetchLogs, streamingInterval, currentDeploymentId]);

  const stopLogStreaming = useCallback(() => {
    if (streamingInterval) {
      clearInterval(streamingInterval);
      setStreamingInterval(null);
    }
    setIsStreaming(false);
    setCurrentDeploymentId(null);
  }, [streamingInterval]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setError(null);
  }, []);

  const searchLogs = useCallback((query: string): LogEntry[] => {
    if (!query) return logs;
    
    const lowercaseQuery = query.toLowerCase();
    return logs.filter(log => 
      log.message.toLowerCase().includes(lowercaseQuery) ||
      log.source.toLowerCase().includes(lowercaseQuery)
    );
  }, [logs]);

  const filterLogs = useCallback((level: LogEntry['level'] | 'all'): LogEntry[] => {
    if (level === 'all') return logs;
    return logs.filter(log => log.level === level);
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamingInterval) {
        clearInterval(streamingInterval);
      }
    };
  }, [streamingInterval]);

  const value: DeploymentLogsContextType = {
    logs,
    isLoading,
    isStreaming,
    error,
    fetchLogs,
    addLog,
    startLogStreaming,
    stopLogStreaming,
    clearLogs,
    searchLogs,
    filterLogs,
  };

  return (
    <DeploymentLogsContext.Provider value={value}>
      {children}
    </DeploymentLogsContext.Provider>
  );
}

// Utility function to simulate deployment process with real logs
export async function simulateDeploymentWithLogs(
  deploymentId: string,
  projectId: string,
  addLog: DeploymentLogsContextType['addLog']
) {
  const deploymentSteps = [
    { level: 'info' as const, message: 'Starting deployment process...', source: 'deployer' },
    { level: 'info' as const, message: 'Validating project configuration...', source: 'validator' },
    { level: 'success' as const, message: 'Configuration validated successfully', source: 'validator' },
    { level: 'info' as const, message: 'Installing dependencies...', source: 'npm' },
    { level: 'info' as const, message: 'Running build process...', source: 'webpack' },
    { level: 'warn' as const, message: 'Some warnings during build process', source: 'webpack' },
    { level: 'success' as const, message: 'Build completed successfully', source: 'webpack' },
    { level: 'info' as const, message: 'Uploading files to S3...', source: 'aws' },
    { level: 'info' as const, message: 'Configuring CloudFront distribution...', source: 'aws' },
    { level: 'success' as const, message: 'Deployment completed successfully!', source: 'deployer' }
  ];

  for (let i = 0; i < deploymentSteps.length; i++) {
    const step = deploymentSteps[i];
    await addLog(deploymentId, projectId, step.level, step.message, step.source, {
      step: i + 1,
      totalSteps: deploymentSteps.length
    });
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  }
}
