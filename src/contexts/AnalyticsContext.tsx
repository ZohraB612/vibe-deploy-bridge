import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";
import { CloudWatchLogsClient, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

// Analytics interfaces
export interface AnalyticsMetric {
  id: string;
  projectId: string;
  metricType: 'performance' | 'traffic' | 'error' | 'uptime';
  metricName: string;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface PerformanceData {
  timestamp: string;
  uptime: number;
  loadTime: number;
  responseTime: number;
  errorRate: number;
}

export interface TrafficData {
  date: string;
  visitors: number;
  pageViews: number;
  bounceRate: number;
  sessionDuration: number;
}

export interface MonitoringEndpoint {
  id: string;
  projectId: string;
  endpointUrl: string;
  checkInterval: number;
  isActive: boolean;
  lastCheckAt?: Date;
  lastStatusCode?: number;
  lastResponseTime?: number;
}

export interface AnalyticsContextType {
  // Performance Metrics
  performanceData: PerformanceData[];
  currentUptime: number;
  avgLoadTime: number;
  avgResponseTime: number;
  isLoadingPerformance: boolean;
  
  // Traffic Analytics
  trafficData: TrafficData[];
  totalVisitors: number;
  totalPageViews: number;
  bounceRate: number;
  avgSessionDuration: string;
  isLoadingTraffic: boolean;
  
  // Real-time monitoring
  monitoringEndpoints: MonitoringEndpoint[];
  isLoadingEndpoints: boolean;
  
  // Methods
  fetchPerformanceMetrics: (projectId: string, timeRange: '1h' | '24h' | '7d' | '30d') => Promise<void>;
  fetchTrafficAnalytics: (projectId: string, timeRange: '1h' | '24h' | '7d' | '30d') => Promise<void>;
  addMonitoringEndpoint: (projectId: string, url: string, checkInterval: number) => Promise<boolean>;
  removeMonitoringEndpoint: (endpointId: string) => Promise<boolean>;
  startRealTimeMonitoring: (projectId: string) => void;
  stopRealTimeMonitoring: () => void;
  recordMetric: (projectId: string, metricType: AnalyticsMetric['metricType'], metricName: string, value: number, unit: string) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { user, isAuthenticated } = useAuth();
  
  // Performance state
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [currentUptime, setCurrentUptime] = useState(99.8);
  const [avgLoadTime, setAvgLoadTime] = useState(1.2);
  const [avgResponseTime, setAvgResponseTime] = useState(85);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);
  
  // Traffic state
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [totalPageViews, setTotalPageViews] = useState(0);
  const [bounceRate, setBounceRate] = useState(0);
  const [avgSessionDuration, setAvgSessionDuration] = useState("0m 0s");
  const [isLoadingTraffic, setIsLoadingTraffic] = useState(false);
  
  // Monitoring state
  const [monitoringEndpoints, setMonitoringEndpoints] = useState<MonitoringEndpoint[]>([]);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null);

  // AWS CloudWatch clients (will be initialized with user's AWS credentials)
  const [cloudWatchClient, setCloudWatchClient] = useState<CloudWatchClient | null>(null);
  const [cloudWatchLogsClient, setCloudWatchLogsClient] = useState<CloudWatchLogsClient | null>(null);

  // Initialize AWS clients when user connects AWS
  useEffect(() => {
    // TODO: Initialize AWS clients with user's credentials from AWSContext
    // For now, we'll simulate real data until AWS is connected
  }, [user]);

  const recordMetric = useCallback(async (
    projectId: string, 
    metricType: AnalyticsMetric['metricType'], 
    metricName: string, 
    value: number, 
    unit: string
  ) => {
    if (!user) return;

    try {
      await supabase.from('project_analytics').insert({
        project_id: projectId,
        user_id: user.id,
        metric_type: metricType,
        metric_name: metricName,
        value,
        unit,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }, [user]);

  const fetchPerformanceMetrics = useCallback(async (
    projectId: string, 
    timeRange: '1h' | '24h' | '7d' | '30d'
  ) => {
    if (!user) return;
    
    setIsLoadingPerformance(true);
    
    try {
      // Calculate time range
      const now = new Date();
      const hoursBack = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

      // Fetch from database
      const { data, error } = await supabase
        .from('project_analytics')
        .select('*')
        .eq('project_id', projectId)
        .eq('metric_type', 'performance')
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Transform data for charts
      const metrics = data || [];
      const timeSlots = generateTimeSlots(startTime, now, timeRange);
      
      const performanceMetrics = timeSlots.map(slot => {
        const slotMetrics = metrics.filter(m => 
          new Date(m.timestamp) >= slot.start && new Date(m.timestamp) < slot.end
        );
        
        const uptimeMetrics = slotMetrics.filter(m => m.metric_name === 'uptime');
        const loadTimeMetrics = slotMetrics.filter(m => m.metric_name === 'load_time');
        const responseTimeMetrics = slotMetrics.filter(m => m.metric_name === 'response_time');
        const errorMetrics = slotMetrics.filter(m => m.metric_name === 'error_rate');
        
        return {
          timestamp: slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          uptime: uptimeMetrics.length > 0 ? uptimeMetrics.reduce((sum, m) => sum + Number(m.value), 0) / uptimeMetrics.length : 99.5,
          loadTime: loadTimeMetrics.length > 0 ? loadTimeMetrics.reduce((sum, m) => sum + Number(m.value), 0) / loadTimeMetrics.length : 1.2,
          responseTime: responseTimeMetrics.length > 0 ? responseTimeMetrics.reduce((sum, m) => sum + Number(m.value), 0) / responseTimeMetrics.length : 85,
          errorRate: errorMetrics.length > 0 ? errorMetrics.reduce((sum, m) => sum + Number(m.value), 0) / errorMetrics.length : 0.1,
        };
      });

      setPerformanceData(performanceMetrics);
      
      // Update current metrics
      if (performanceMetrics.length > 0) {
        const latest = performanceMetrics[performanceMetrics.length - 1];
        setCurrentUptime(latest.uptime);
        setAvgLoadTime(latest.loadTime);
        setAvgResponseTime(latest.responseTime);
      }
      
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setIsLoadingPerformance(false);
    }
  }, [user]);

  const fetchTrafficAnalytics = useCallback(async (
    projectId: string, 
    timeRange: '1h' | '24h' | '7d' | '30d'
  ) => {
    if (!user) return;
    
    setIsLoadingTraffic(true);
    
    try {
      // Calculate time range
      const now = new Date();
      const hoursBack = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

      // Fetch traffic data from database
      const { data, error } = await supabase
        .from('project_analytics')
        .select('*')
        .eq('project_id', projectId)
        .eq('metric_type', 'traffic')
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const metrics = data || [];
      
      // Group by day for traffic analytics
      const daySlots = generateDaySlots(startTime, now);
      
      const traffic = daySlots.map(slot => {
        const dayMetrics = metrics.filter(m => 
          new Date(m.timestamp) >= slot.start && new Date(m.timestamp) < slot.end
        );
        
        const visitorMetrics = dayMetrics.filter(m => m.metric_name === 'unique_visitors');
        const pageViewMetrics = dayMetrics.filter(m => m.metric_name === 'page_views');
        const bounceMetrics = dayMetrics.filter(m => m.metric_name === 'bounce_rate');
        const sessionMetrics = dayMetrics.filter(m => m.metric_name === 'session_duration');
        
        return {
          date: slot.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          visitors: visitorMetrics.reduce((sum, m) => sum + Number(m.value), 0),
          pageViews: pageViewMetrics.reduce((sum, m) => sum + Number(m.value), 0),
          bounceRate: bounceMetrics.length > 0 ? bounceMetrics.reduce((sum, m) => sum + Number(m.value), 0) / bounceMetrics.length : 35,
          sessionDuration: sessionMetrics.length > 0 ? sessionMetrics.reduce((sum, m) => sum + Number(m.value), 0) / sessionMetrics.length : 180,
        };
      });

      setTrafficData(traffic);
      
      // Calculate totals
      const totalV = traffic.reduce((sum, day) => sum + day.visitors, 0);
      const totalPV = traffic.reduce((sum, day) => sum + day.pageViews, 0);
      const avgBounce = traffic.length > 0 ? traffic.reduce((sum, day) => sum + day.bounceRate, 0) / traffic.length : 35;
      const avgSession = traffic.length > 0 ? traffic.reduce((sum, day) => sum + day.sessionDuration, 0) / traffic.length : 180;
      
      setTotalVisitors(totalV);
      setTotalPageViews(totalPV);
      setBounceRate(avgBounce);
      setAvgSessionDuration(`${Math.floor(avgSession / 60)}m ${avgSession % 60}s`);
      
    } catch (error) {
      console.error('Failed to fetch traffic analytics:', error);
    } finally {
      setIsLoadingTraffic(false);
    }
  }, [user]);

  const addMonitoringEndpoint = useCallback(async (
    projectId: string, 
    url: string, 
    checkInterval: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('monitoring_endpoints')
        .insert({
          project_id: projectId,
          user_id: user.id,
          endpoint_url: url,
          check_interval: checkInterval,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      const newEndpoint: MonitoringEndpoint = {
        id: data.id,
        projectId: data.project_id,
        endpointUrl: data.endpoint_url,
        checkInterval: data.check_interval,
        isActive: data.is_active,
        lastCheckAt: data.last_check_at ? new Date(data.last_check_at) : undefined,
        lastStatusCode: data.last_status_code,
        lastResponseTime: data.last_response_time
      };

      setMonitoringEndpoints(prev => [...prev, newEndpoint]);
      return true;
    } catch (error) {
      console.error('Failed to add monitoring endpoint:', error);
      return false;
    }
  }, [user]);

  const removeMonitoringEndpoint = useCallback(async (endpointId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('monitoring_endpoints')
        .delete()
        .eq('id', endpointId)
        .eq('user_id', user.id);

      if (error) throw error;

      setMonitoringEndpoints(prev => prev.filter(endpoint => endpoint.id !== endpointId));
      return true;
    } catch (error) {
      console.error('Failed to remove monitoring endpoint:', error);
      return false;
    }
  }, [user]);

  const startRealTimeMonitoring = useCallback((projectId: string) => {
    if (monitoringInterval) return; // Already monitoring

    const interval = setInterval(async () => {
      // Check all active endpoints for this project
      const activeEndpoints = monitoringEndpoints.filter(
        endpoint => endpoint.projectId === projectId && endpoint.isActive
      );

      for (const endpoint of activeEndpoints) {
        try {
          const startTime = Date.now();
          const response = await fetch(endpoint.endpointUrl, {
            method: 'HEAD',
            mode: 'no-cors'
          });
          const responseTime = Date.now() - startTime;

          // Record the check
          await recordMetric(projectId, 'performance', 'response_time', responseTime, 'ms');
          await recordMetric(projectId, 'performance', 'uptime', response.ok ? 100 : 0, 'percentage');

          // Update endpoint status
          await supabase
            .from('monitoring_endpoints')
            .update({
              last_check_at: new Date().toISOString(),
              last_status_code: response.status,
              last_response_time: responseTime
            })
            .eq('id', endpoint.id);

        } catch (error) {
          console.error('Monitoring check failed:', error);
          // Record downtime
          await recordMetric(projectId, 'performance', 'uptime', 0, 'percentage');
        }
      }
    }, 60000); // Check every minute

    setMonitoringInterval(interval);
  }, [monitoringEndpoints, recordMetric]);

  const stopRealTimeMonitoring = useCallback(() => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
  }, [monitoringInterval]);

  // Helper functions
  const generateTimeSlots = (start: Date, end: Date, timeRange: '1h' | '24h' | '7d' | '30d') => {
    const slots = [];
    const intervalMinutes = timeRange === '1h' ? 5 : timeRange === '24h' ? 60 : 360; // 5min, 1h, 6h
    const current = new Date(start);
    
    while (current < end) {
      const slotEnd = new Date(current.getTime() + intervalMinutes * 60 * 1000);
      slots.push({
        start: new Date(current),
        end: slotEnd > end ? end : slotEnd
      });
      current.setTime(current.getTime() + intervalMinutes * 60 * 1000);
    }
    
    return slots;
  };

  const generateDaySlots = (start: Date, end: Date) => {
    const slots = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    
    while (current < end) {
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);
      slots.push({
        start: new Date(current),
        end: dayEnd > end ? end : dayEnd
      });
      current.setDate(current.getDate() + 1);
    }
    
    return slots;
  };

  const value: AnalyticsContextType = {
    // Performance
    performanceData,
    currentUptime,
    avgLoadTime,
    avgResponseTime,
    isLoadingPerformance,
    
    // Traffic
    trafficData,
    totalVisitors,
    totalPageViews,
    bounceRate,
    avgSessionDuration,
    isLoadingTraffic,
    
    // Monitoring
    monitoringEndpoints,
    isLoadingEndpoints,
    
    // Methods
    fetchPerformanceMetrics,
    fetchTrafficAnalytics,
    addMonitoringEndpoint,
    removeMonitoringEndpoint,
    startRealTimeMonitoring,
    stopRealTimeMonitoring,
    recordMetric,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}
