import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Clock, Zap, TrendingUp, AlertTriangle } from "lucide-react";

interface PerformanceData {
  timestamp: string;
  uptime: number;
  loadTime: number;
  responseTime: number;
}

interface PerformanceMetricsProps {
  projectId: string;
}

export function PerformanceMetrics({ projectId }: PerformanceMetricsProps) {
  const [currentUptime, setCurrentUptime] = useState(99.8);
  const [avgLoadTime, setAvgLoadTime] = useState(1.2);
  const [avgResponseTime, setAvgResponseTime] = useState(85);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);

  // Mock data generation
  useEffect(() => {
    const generateMockData = () => {
      const now = new Date();
      const data: PerformanceData[] = [];
      
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        data.push({
          timestamp: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          uptime: 98 + Math.random() * 2,
          loadTime: 0.8 + Math.random() * 0.8,
          responseTime: 60 + Math.random() * 50,
        });
      }
      return data;
    };

    setPerformanceData(generateMockData());

    // Simulate real-time updates
    const interval = setInterval(() => {
      setCurrentUptime(prev => Math.max(95, Math.min(100, prev + (Math.random() - 0.5) * 0.2)));
      setAvgLoadTime(prev => Math.max(0.5, Math.min(3, prev + (Math.random() - 0.5) * 0.1)));
      setAvgResponseTime(prev => Math.max(30, Math.min(200, prev + (Math.random() - 0.5) * 10)));
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId]);

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

  return (
    <div className="space-y-6">
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