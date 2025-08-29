import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { ECSClient, UpdateServiceCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { LambdaClient, UpdateFunctionConfigurationCommand } from '@aws-sdk/client-lambda';

export interface ScalingMetrics {
  cpuUtilization: number;
  memoryUtilization: number;
  responseTime: number;
  requestCount: number;
  errorRate: number;
  timestamp: Date;
}

export interface ScalingThresholds {
  scaleUpCPU: number;
  scaleDownCPU: number;
  scaleUpMemory: number;
  scaleDownMemory: number;
  scaleUpResponseTime: number;
  scaleDownResponseTime: number;
  scaleUpErrorRate: number;
  scaleDownErrorRate: number;
  minInstances: number;
  maxInstances: number;
  cooldownPeriod: number; // seconds
}

export interface ScalingDecision {
  shouldScale: boolean;
  direction: 'up' | 'down' | 'none';
  reason: string;
  currentInstances: number;
  targetInstances: number;
  metrics: ScalingMetrics;
}

export class AutoScalingService {
  private cloudWatchClient: CloudWatchClient;
  private ecsClient: ECSClient;
  private lambdaClient: LambdaClient;
  private lastScalingTime: Map<string, number> = new Map();
  private defaultThresholds: ScalingThresholds = {
    scaleUpCPU: 70,
    scaleDownCPU: 30,
    scaleUpMemory: 80,
    scaleDownMemory: 40,
    scaleUpResponseTime: 1000, // ms
    scaleDownResponseTime: 200, // ms
    scaleUpErrorRate: 5, // percentage
    scaleDownErrorRate: 1, // percentage
    minInstances: 1,
    maxInstances: 10,
    cooldownPeriod: 300 // 5 minutes
  };

  constructor(
    private region: string = 'us-east-1',
    private credentials?: any
  ) {
    this.cloudWatchClient = new CloudWatchClient({ region: this.region, credentials: this.credentials });
    this.ecsClient = new ECSClient({ region: this.region, credentials: this.credentials });
    this.lambdaClient = new LambdaClient({ region: this.region, credentials: this.credentials });
  }

  /**
   * Check if scaling is needed and execute scaling actions
   */
  async checkAndScale(projectId: string, serviceType: 'ecs' | 'lambda'): Promise<ScalingDecision> {
    try {
      // Get current metrics
      const metrics = await this.getPerformanceMetrics(projectId);
      
      // Make scaling decision
      const decision = this.evaluateScalingDecision(metrics, projectId);
      
      if (decision.shouldScale) {
        // Check cooldown period
        if (this.isInCooldown(projectId)) {
          decision.shouldScale = false;
          decision.reason = 'Scaling is in cooldown period';
          return decision;
        }
        
        // Execute scaling
        await this.executeScaling(projectId, serviceType, decision);
        
        // Update cooldown timestamp
        this.lastScalingTime.set(projectId, Date.now());
      }
      
      return decision;
    } catch (error) {
      console.error(`Auto-scaling check failed for project ${projectId}:`, error);
      return {
        shouldScale: false,
        direction: 'none',
        reason: `Scaling check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        currentInstances: 0,
        targetInstances: 0,
        metrics: this.getDefaultMetrics()
      };
    }
  }

  /**
   * Get performance metrics from CloudWatch
   */
  private async getPerformanceMetrics(projectId: string): Promise<ScalingMetrics> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes
    
    const metrics = await Promise.all([
      this.getMetric('CPUUtilization', projectId, startTime, endTime),
      this.getMetric('MemoryUtilization', projectId, startTime, endTime),
      this.getMetric('ResponseTime', projectId, startTime, endTime),
      this.getMetric('RequestCount', projectId, startTime, endTime),
      this.getMetric('ErrorCount', projectId, startTime, endTime)
    ]);
    
    const [cpu, memory, responseTime, requestCount, errorCount] = metrics;
    const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
    
    return {
      cpuUtilization: cpu,
      memoryUtilization: memory,
      responseTime,
      requestCount,
      errorRate,
      timestamp: endTime
    };
  }

  /**
   * Get a specific metric from CloudWatch
   */
  private async getMetric(metricName: string, projectId: string, startTime: Date, endTime: Date): Promise<number> {
    try {
      const command = new GetMetricStatisticsCommand({
        Namespace: 'AWS/ECS',
        MetricName: metricName,
        Dimensions: [
          {
            Name: 'ServiceName',
            Value: `deployhub-${projectId}`
          }
        ],
        StartTime: startTime,
        EndTime: endTime,
        Period: 300, // 5 minutes
        Statistics: ['Average']
      });
      
      const response = await this.cloudWatchClient.send(command);
      const dataPoints = response.Datapoints || [];
      
      if (dataPoints.length === 0) {
        return 0;
      }
      
      // Return the most recent data point
      const latestDataPoint = dataPoints.reduce((latest, current) => 
        current.Timestamp && latest.Timestamp && current.Timestamp > latest.Timestamp ? current : latest
      );
      
      return latestDataPoint.Average || 0;
    } catch (error) {
      console.warn(`Failed to get metric ${metricName} for project ${projectId}:`, error);
      return 0;
    }
  }

  /**
   * Evaluate if scaling is needed based on metrics
   */
  private evaluateScalingDecision(metrics: ScalingMetrics, projectId: string): ScalingDecision {
    const thresholds = this.getScalingThresholds(projectId);
    
    // Check for scale up conditions
    if (metrics.cpuUtilization > thresholds.scaleUpCPU ||
        metrics.memoryUtilization > thresholds.scaleUpMemory ||
        metrics.responseTime > thresholds.scaleUpResponseTime ||
        metrics.errorRate > thresholds.scaleUpErrorRate) {
      
      return {
        shouldScale: true,
        direction: 'up',
        reason: this.getScaleUpReason(metrics, thresholds),
        currentInstances: 0, // Will be fetched during execution
        targetInstances: 0, // Will be calculated during execution
        metrics
      };
    }
    
    // Check for scale down conditions
    if (metrics.cpuUtilization < thresholds.scaleDownCPU &&
        metrics.memoryUtilization < thresholds.scaleDownMemory &&
        metrics.responseTime < thresholds.scaleDownResponseTime &&
        metrics.errorRate < thresholds.scaleDownErrorRate) {
      
      return {
        shouldScale: true,
        direction: 'down',
        reason: this.getScaleDownReason(metrics, thresholds),
        currentInstances: 0, // Will be fetched during execution
        targetInstances: 0, // Will be calculated during execution
        metrics
      };
    }
    
    return {
      shouldScale: false,
      direction: 'none',
      reason: 'All metrics within acceptable ranges',
      currentInstances: 0,
      targetInstances: 0,
      metrics
    };
  }

  /**
   * Get the reason for scaling up
   */
  private getScaleUpReason(metrics: ScalingMetrics, thresholds: ScalingThresholds): string {
    const reasons = [];
    
    if (metrics.cpuUtilization > thresholds.scaleUpCPU) {
      reasons.push(`CPU utilization (${metrics.cpuUtilization.toFixed(1)}%) above threshold (${thresholds.scaleUpCPU}%)`);
    }
    
    if (metrics.memoryUtilization > thresholds.scaleUpMemory) {
      reasons.push(`Memory utilization (${metrics.memoryUtilization.toFixed(1)}%) above threshold (${thresholds.scaleUpMemory}%)`);
    }
    
    if (metrics.responseTime > thresholds.scaleUpResponseTime) {
      reasons.push(`Response time (${metrics.responseTime.toFixed(0)}ms) above threshold (${thresholds.scaleUpResponseTime}ms)`);
    }
    
    if (metrics.errorRate > thresholds.scaleUpErrorRate) {
      reasons.push(`Error rate (${metrics.errorRate.toFixed(1)}%) above threshold (${thresholds.scaleUpErrorRate}%)`);
    }
    
    return `Scaling up due to: ${reasons.join(', ')}`;
  }

  /**
   * Get the reason for scaling down
   */
  private getScaleDownReason(metrics: ScalingMetrics, thresholds: ScalingThresholds): string {
    const reasons = [];
    
    if (metrics.cpuUtilization < thresholds.scaleDownCPU) {
      reasons.push(`CPU utilization (${metrics.cpuUtilization.toFixed(1)}%) below threshold (${thresholds.scaleDownCPU}%)`);
    }
    
    if (metrics.memoryUtilization < thresholds.scaleDownMemory) {
      reasons.push(`Memory utilization (${metrics.memoryUtilization.toFixed(1)}%) below threshold (${thresholds.scaleDownMemory}%)`);
    }
    
    if (metrics.responseTime < thresholds.scaleDownResponseTime) {
      reasons.push(`Response time (${metrics.responseTime.toFixed(0)}ms) below threshold (${thresholds.scaleDownResponseTime}ms)`);
    }
    
    if (metrics.errorRate < thresholds.scaleDownErrorRate) {
      reasons.push(`Error rate (${metrics.errorRate.toFixed(1)}%) below threshold (${thresholds.scaleDownErrorRate}%)`);
    }
    
    return `Scaling down due to: ${reasons.join(', ')}`;
  }

  /**
   * Execute the scaling action
   */
  private async executeScaling(projectId: string, serviceType: 'ecs' | 'lambda', decision: ScalingDecision): Promise<void> {
    try {
      if (serviceType === 'ecs') {
        await this.scaleECSService(projectId, decision);
      } else if (serviceType === 'lambda') {
        await this.scaleLambdaFunction(projectId, decision);
      }
    } catch (error) {
      console.error(`Failed to execute scaling for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Scale ECS service
   */
  private async scaleECSService(projectId: string, decision: ScalingDecision): Promise<void> {
    const serviceName = `deployhub-${projectId}`;
    const clusterName = `deployhub-cluster`;
    
    // Get current service configuration
    const describeCommand = new DescribeServicesCommand({
      cluster: clusterName,
      services: [serviceName]
    });
    
    const serviceResponse = await this.ecsClient.send(describeCommand);
    const service = serviceResponse.services?.[0];
    
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    const currentDesiredCount = service.desiredCount || 1;
    let targetDesiredCount = currentDesiredCount;
    
    if (decision.direction === 'up') {
      targetDesiredCount = Math.min(currentDesiredCount + 1, this.defaultThresholds.maxInstances);
    } else if (decision.direction === 'down') {
      targetDesiredCount = Math.max(currentDesiredCount - 1, this.defaultThresholds.minInstances);
    }
    
    if (targetDesiredCount !== currentDesiredCount) {
      const updateCommand = new UpdateServiceCommand({
        cluster: clusterName,
        service: serviceName,
        desiredCount: targetDesiredCount
      });
      
      await this.ecsClient.send(updateCommand);
      
      console.log(`Scaled ECS service ${serviceName} from ${currentDesiredCount} to ${targetDesiredCount} instances`);
    }
  }

  /**
   * Scale Lambda function
   */
  private async scaleLambdaFunction(projectId: string, decision: ScalingDecision): Promise<void> {
    const functionName = `deployhub-${projectId}`;
    
    // For Lambda, we adjust reserved concurrency
    // This is a simplified approach - in production you might want more sophisticated logic
    
    if (decision.direction === 'up') {
      // Increase reserved concurrency
      const updateCommand = new UpdateFunctionConfigurationCommand({
        FunctionName: functionName,
        ReservedConcurrencyLimit: 100 // Example value
      });
      
      await this.lambdaClient.send(updateCommand);
      console.log(`Increased reserved concurrency for Lambda function ${functionName}`);
    }
  }

  /**
   * Check if scaling is in cooldown period
   */
  private isInCooldown(projectId: string): boolean {
    const lastScaling = this.lastScalingTime.get(projectId);
    if (!lastScaling) {
      return false;
    }
    
    const cooldownPeriod = this.getScalingThresholds(projectId).cooldownPeriod * 1000; // Convert to milliseconds
    return Date.now() - lastScaling < cooldownPeriod;
  }

  /**
   * Get scaling thresholds for a specific project
   * In production, this could be fetched from a database or configuration service
   */
  private getScalingThresholds(projectId: string): ScalingThresholds {
    // For now, return default thresholds
    // In production, you might have project-specific thresholds
    return this.defaultThresholds;
  }

  /**
   * Get default metrics when CloudWatch data is unavailable
   */
  private getDefaultMetrics(): ScalingMetrics {
    return {
      cpuUtilization: 0,
      memoryUtilization: 0,
      responseTime: 0,
      requestCount: 0,
      errorRate: 0,
      timestamp: new Date()
    };
  }

  /**
   * Set custom scaling thresholds for a project
   */
  setScalingThresholds(projectId: string, thresholds: Partial<ScalingThresholds>): void {
    // In production, this would persist to a database
    console.log(`Setting custom scaling thresholds for project ${projectId}:`, thresholds);
  }

  /**
   * Get scaling history for a project
   */
  getScalingHistory(projectId: string, limit: number = 100): Array<{ timestamp: number; direction: string; reason: string }> {
    // In production, this would fetch from a database
    return [];
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Clean up AWS clients
    await this.cloudWatchClient.destroy();
    await this.ecsClient.destroy();
    await this.lambdaClient.destroy();
  }
}

export default AutoScalingService;
