import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceMetrics {
  pageLoadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

interface PerformanceMonitorProps {
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  showDetails?: boolean;
  className?: string;
}

export function PerformanceMonitor({
  onMetricsUpdate,
  showDetails = false,
  className
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    timeToInteractive: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(0);

  const calculatePerformanceScore = useCallback((metrics: PerformanceMetrics): number => {
    let score = 100;

    // Page load time (target: < 2s)
    if (metrics.pageLoadTime > 2000) {
      score -= Math.min(30, (metrics.pageLoadTime - 2000) / 100);
    }

    // Time to interactive (target: < 3.8s)
    if (metrics.timeToInteractive > 3800) {
      score -= Math.min(25, (metrics.timeToInteractive - 3800) / 150);
    }

    // First contentful paint (target: < 1.8s)
    if (metrics.firstContentfulPaint > 1800) {
      score -= Math.min(20, (metrics.firstContentfulPaint - 1800) / 90);
    }

    // Largest contentful paint (target: < 2.5s)
    if (metrics.largestContentfulPaint > 2500) {
      score -= Math.min(15, (metrics.largestContentfulPaint - 2500) / 125);
    }

    // Cumulative layout shift (target: < 0.1)
    if (metrics.cumulativeLayoutShift > 0.1) {
      score -= Math.min(10, metrics.cumulativeLayoutShift * 100);
    }

    return Math.max(0, Math.round(score));
  }, []);

  const measurePerformance = useCallback(async () => {
    if (!('performance' in window)) {
      console.warn('Performance API not supported');
      return;
    }

    setIsMonitoring(true);

    // Wait for page to fully load
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true });
      });
    }

    // Wait a bit more for all resources to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    const layoutShiftEntries = performance.getEntriesByType('layout-shift');

    const newMetrics: PerformanceMetrics = {
      pageLoadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      timeToInteractive: navigation ? navigation.domInteractive - navigation.fetchStart : 0,
      firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      largestContentfulPaint: 0, // Would need to observe this
      cumulativeLayoutShift: layoutShiftEntries.reduce((sum, entry) => sum + (entry as any).value, 0),
      firstInputDelay: 0 // Would need to observe this
    };

    setMetrics(newMetrics);
    const score = calculatePerformanceScore(newMetrics);
    setPerformanceScore(score);
    onMetricsUpdate?.(newMetrics);
    setIsMonitoring(false);
  }, [onMetricsUpdate, calculatePerformanceScore]);

  const getPerformanceColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Improvement';
    return 'Poor';
  };

  useEffect(() => {
    // Auto-measure on mount
    measurePerformance();
  }, [measurePerformance]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Performance Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Score */}
        <div className="text-center">
          <div className={cn("text-3xl font-bold", getPerformanceColor(performanceScore))}>
            {performanceScore}
          </div>
          <div className="text-sm text-muted-foreground">
            {getPerformanceLabel(performanceScore)}
          </div>
          <Progress value={performanceScore} className="mt-2" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold">
              {Math.round(metrics.pageLoadTime)}ms
            </div>
            <div className="text-xs text-muted-foreground">Page Load</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold">
              {Math.round(metrics.timeToInteractive)}ms
            </div>
            <div className="text-xs text-muted-foreground">Interactive</div>
          </div>
        </div>

        {/* Detailed Metrics */}
        {showDetails && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span>First Contentful Paint:</span>
              <span className="font-mono">
                {Math.round(metrics.firstContentfulPaint)}ms
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Largest Contentful Paint:</span>
              <span className="font-mono">
                {Math.round(metrics.largestContentfulPaint)}ms
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Cumulative Layout Shift:</span>
              <span className="font-mono">
                {metrics.cumulativeLayoutShift.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>First Input Delay:</span>
              <span className="font-mono">
                {Math.round(metrics.firstInputDelay)}ms
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={measurePerformance}
            disabled={isMonitoring}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {isMonitoring ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Measuring...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Measure Performance
              </>
            )}
          </Button>
        </div>

        {/* Performance Tips */}
        {performanceScore < 90 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <div className="font-medium">Performance Tips:</div>
                <ul className="mt-1 space-y-1 text-xs">
                  {metrics.pageLoadTime > 2000 && (
                    <li>• Optimize images and reduce bundle size</li>
                  )}
                  {metrics.timeToInteractive > 3800 && (
                    <li>• Minimize JavaScript execution time</li>
                  )}
                  {metrics.firstContentfulPaint > 1800 && (
                    <li>• Optimize critical rendering path</li>
                  )}
                  {metrics.cumulativeLayoutShift > 0.1 && (
                    <li>• Avoid layout shifts by setting explicit dimensions</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const measurePerformance = useCallback(async () => {
    if (!('performance' in window)) return null;

    setIsMonitoring(true);
    
    try {
      // Wait for page to load
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          window.addEventListener('load', resolve, { once: true });
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');

      const newMetrics: PerformanceMetrics = {
        pageLoadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        timeToInteractive: navigation ? navigation.domInteractive - navigation.fetchStart : 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0
      };

      setMetrics(newMetrics);
      return newMetrics;
    } finally {
      setIsMonitoring(false);
    }
  }, []);

  return {
    metrics,
    isMonitoring,
    measurePerformance
  };
}
