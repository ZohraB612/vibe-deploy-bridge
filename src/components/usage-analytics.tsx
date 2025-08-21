import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Eye, Download, Globe, Smartphone, Monitor, Tablet } from "lucide-react";

interface VisitorData {
  date: string;
  visitors: number;
  pageViews: number;
  bounceRate: number;
}

interface DeviceData {
  name: string;
  value: number;
  color: string;
}

interface BandwidthData {
  time: string;
  bandwidth: number;
  requests: number;
}

interface UsageAnalyticsProps {
  projectId: string;
}

export function UsageAnalytics({ projectId }: UsageAnalyticsProps) {
  const [totalVisitors, setTotalVisitors] = useState(12543);
  const [totalPageViews, setTotalPageViews] = useState(45672);
  const [bounceRate, setBounceRate] = useState(34.2);
  const [avgSessionDuration, setAvgSessionDuration] = useState("3m 42s");
  
  const [visitorData, setVisitorData] = useState<VisitorData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [bandwidthData, setBandwidthData] = useState<BandwidthData[]>([]);

  useEffect(() => {
    // Generate mock visitor data for the last 7 days
    const generateVisitorData = () => {
      const data: VisitorData[] = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          visitors: Math.floor(1500 + Math.random() * 800),
          pageViews: Math.floor(4000 + Math.random() * 2000),
          bounceRate: 25 + Math.random() * 20,
        });
      }
      return data;
    };

    // Generate device distribution data
    const generateDeviceData = (): DeviceData[] => [
      { name: 'Desktop', value: 45.2, color: 'hsl(var(--primary))' },
      { name: 'Mobile', value: 38.7, color: 'hsl(var(--success))' },
      { name: 'Tablet', value: 16.1, color: 'hsl(var(--warning))' },
    ];

    // Generate bandwidth data for the last 24 hours
    const generateBandwidthData = () => {
      const data: BandwidthData[] = [];
      const now = new Date();
      
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        data.push({
          time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          bandwidth: 50 + Math.random() * 100, // MB
          requests: Math.floor(200 + Math.random() * 400),
        });
      }
      return data;
    };

    setVisitorData(generateVisitorData());
    setDeviceData(generateDeviceData());
    setBandwidthData(generateBandwidthData());

    // Simulate real-time updates
    const interval = setInterval(() => {
      setTotalVisitors(prev => prev + Math.floor(Math.random() * 10));
      setTotalPageViews(prev => prev + Math.floor(Math.random() * 25));
    }, 10000);

    return () => clearInterval(interval);
  }, [projectId]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalBandwidth = bandwidthData.reduce((sum, item) => sum + item.bandwidth, 0);
  const totalRequests = bandwidthData.reduce((sum, item) => sum + item.requests, 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisitors.toLocaleString()}</div>
            <p className="text-xs text-success">+12.3% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPageViews.toLocaleString()}</div>
            <p className="text-xs text-success">+8.7% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bounceRate.toFixed(1)}%</div>
            <p className="text-xs text-destructive">+2.1% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSessionDuration}</div>
            <p className="text-xs text-success">+15.2% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visitors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="visitors">Visitor Analytics</TabsTrigger>
          <TabsTrigger value="devices">Device Breakdown</TabsTrigger>
          <TabsTrigger value="bandwidth">Bandwidth Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="visitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visitor Trends (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visitorData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
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
                      dataKey="visitors"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      name="Visitors"
                    />
                    <Line
                      type="monotone"
                      dataKey="pageViews"
                      stroke="hsl(var(--success))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--success))' }}
                      name="Page Views"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Device Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value}%`, 'Usage']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {deviceData.map((device) => {
                  const Icon = device.name === 'Desktop' ? Monitor : 
                             device.name === 'Mobile' ? Smartphone : Tablet;
                  return (
                    <div key={device.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{device.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: device.color }}
                        />
                        <Badge variant="outline">{device.value}%</Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bandwidth" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bandwidth (24h)</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBytes(totalBandwidth * 1024 * 1024)}</div>
                <p className="text-xs text-muted-foreground">Across {totalRequests.toLocaleString()} requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Request Size</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatBytes((totalBandwidth * 1024 * 1024) / totalRequests)}
                </div>
                <p className="text-xs text-success">-5.2% from yesterday</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bandwidth Usage (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bandwidthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'bandwidth' ? `${value} MB` : value,
                        name === 'bandwidth' ? 'Bandwidth' : 'Requests'
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar
                      dataKey="bandwidth"
                      fill="hsl(var(--primary))"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}