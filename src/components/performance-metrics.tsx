import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Clock, Zap, TrendingUp, AlertTriangle, RefreshCw, Play, Pause } from "lucide-react";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { LoadingSpinner } from "@/components/loading-spinner";

interface PerformanceMetricsProps {
  projectId: string;
}

export function PerformanceMetrics({ projectId }: PerformanceMetricsProps) {
  const {
    performanceData,
    currentUptime,
    avgLoadTime,
    avgResponseTime,
    isLoadingPerformance,
    fetchPerformanceMetrics,
    startRealTimeMonitoring,
    stopRealTimeMonitoring
  } = useAnalytics();

  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Load performance data on mount and when timeRange changes
  useEffect(() => {
    fetchPerformanceMetrics(projectId, timeRange);
  }, [projectId, timeRange, fetchPerformanceMetrics]);

  const handleRefresh = () => {
    fetchPerformanceMetrics(projectId, timeRange);
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      stopRealTimeMonitoring();
    } else {
      startRealTimeMonitoring(projectId);
    }
    setIsMonitoring(!isMonitoring);
  };

  const getUptimeStatus = (uptime: number) => {
    if (uptime >= 99.5) return { color: "bg-success", text: "Excellent" };
    if (uptime >= 99) return { color: "bg-warning", text: "Good" };
    return { color: "bg-destructive", text: "Poor" };
  };

  const getLoadTimeStatus = (loadTime: number) => {
    if (loadTime <= 1.5) return { color: "bg-success", text: "Fast" };
    if (loadTime <= 3) return { color: "bg-warning", text: "Moderate" };
    return { color: "bg-destructive", text: "Slow" };
  };

  const uptimeStatus = getUptimeStatus(currentUptime);
  const loadTimeStatus = getLoadTimeStatus(avgLoadTime);

  if (isLoadingPerformance && performanceData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Performance Metrics</h3>
          {isMonitoring && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Activity className="h-3 w-3 mr-1" />
              Live Monitoring
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(value: '1h' | '24h' | '7d' | '30d') => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7d</SelectItem>
              <SelectItem value="30d">Last 30d</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingPerformance}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingPerformance ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
            onClick={toggleMonitoring}
          >
            {isMonitoring ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Monitor
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUptime.toFixed(2)}%</div>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${uptimeStatus.color}`} />
              <p className="text-xs text-muted-foreground">{uptimeStatus.text}</p>
            </div>
            <Progress value={currentUptime} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Load Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLoadTime.toFixed(2)}s</div>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${loadTimeStatus.color}`} />
              <p className="text-xs text-muted-foreground">{loadTimeStatus.text}</p>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Target: &lt; 1.5s
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</div>
            <div className="flex items-center gap-2 mt-2">
              <TrendingUp className="h-3 w-3 text-success" />
              <p className="text-xs text-success">+5.2% from last week</p>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Global average: 120ms
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Trends (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="timestamp" 
                  className="text-xs fill-muted-foreground"
                />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="uptime"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={false}
                  name="Uptime %"
                />
                <Line
                  type="monotone"
                  dataKey="loadTime"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  name="Load Time (s)"
                />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  dot={false}
                  name="Response Time (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Performance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentUptime < 99.5 && (
              <div className="flex items-center gap-3 p-3 border border-warning rounded-lg bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <div>
                  <p className="text-sm font-medium">Uptime Below Threshold</p>
                  <p className="text-xs text-muted-foreground">
                    Current uptime is {currentUptime.toFixed(2)}%, below the 99.5% target
                  </p>
                </div>
              </div>
            )}
            {avgLoadTime > 2 && (
              <div className="flex items-center gap-3 p-3 border border-warning rounded-lg bg-warning/5">
                <Clock className="h-4 w-4 text-warning" />
                <div>
                  <p className="text-sm font-medium">Slow Load Times Detected</p>
                  <p className="text-xs text-muted-foreground">
                    Average load time is {avgLoadTime.toFixed(2)}s, consider optimization
                  </p>
                </div>
              </div>
            )}
            {currentUptime >= 99.5 && avgLoadTime <= 2 && (
              <div className="flex items-center gap-3 p-3 border border-success rounded-lg bg-success/5">
                <TrendingUp className="h-4 w-4 text-success" />
                <div>
                  <p className="text-sm font-medium">All Systems Operating Normally</p>
                  <p className="text-xs text-muted-foreground">
                    Performance metrics are within acceptable ranges
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}