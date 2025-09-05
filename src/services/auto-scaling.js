"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoScalingService = void 0;
const client_cloudwatch_1 = require("@aws-sdk/client-cloudwatch");
const client_ecs_1 = require("@aws-sdk/client-ecs");
const client_lambda_1 = require("@aws-sdk/client-lambda");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class AutoScalingService {
    constructor(region = 'us-east-1', credentials) {
        this.region = region;
        this.credentials = credentials;
        this.lastScalingTime = new Map();
        this.defaultThresholds = {
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
        this.cloudWatchClient = new client_cloudwatch_1.CloudWatchClient({ region: this.region, credentials: this.credentials });
        this.ecsClient = new client_ecs_1.ECSClient({ region: this.region, credentials: this.credentials });
        this.lambdaClient = new client_lambda_1.LambdaClient({ region: this.region, credentials: this.credentials });
    }
    /**
     * Check if scaling is needed and execute scaling actions
     */
    async checkAndScale(projectId, serviceType) {
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
        }
        catch (error) {
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
    async getPerformanceMetrics(projectId) {
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
    async getMetric(metricName, projectId, startTime, endTime) {
        try {
            const command = new client_cloudwatch_1.GetMetricStatisticsCommand({
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
            const latestDataPoint = dataPoints.reduce((latest, current) => current.Timestamp && latest.Timestamp && current.Timestamp > latest.Timestamp ? current : latest);
            return latestDataPoint.Average || 0;
        }
        catch (error) {
            console.warn(`Failed to get metric ${metricName} for project ${projectId}:`, error);
            return 0;
        }
    }
    /**
     * Evaluate if scaling is needed based on metrics
     */
    evaluateScalingDecision(metrics, projectId) {
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
    getScaleUpReason(metrics, thresholds) {
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
    getScaleDownReason(metrics, thresholds) {
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
    async executeScaling(projectId, serviceType, decision) {
        try {
            if (serviceType === 'ecs') {
                await this.scaleECSService(projectId, decision);
            }
            else if (serviceType === 'lambda') {
                await this.scaleLambdaFunction(projectId, decision);
            }
        }
        catch (error) {
            console.error(`Failed to execute scaling for project ${projectId}:`, error);
            throw error;
        }
    }
    /**
     * Scale ECS service
     */
    async scaleECSService(projectId, decision) {
        const serviceName = `deployhub-${projectId}`;
        const clusterName = `deployhub-cluster`;
        // Get current service configuration
        const describeCommand = new client_ecs_1.DescribeServicesCommand({
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
        }
        else if (decision.direction === 'down') {
            targetDesiredCount = Math.max(currentDesiredCount - 1, this.defaultThresholds.minInstances);
        }
        if (targetDesiredCount !== currentDesiredCount) {
            const updateCommand = new client_ecs_1.UpdateServiceCommand({
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
    async scaleLambdaFunction(projectId, decision) {
        const functionName = `deployhub-${projectId}`;
        // For Lambda, we adjust reserved concurrency
        // This is a simplified approach - in production you might want more sophisticated logic
        if (decision.direction === 'up') {
            // Increase reserved concurrency
            const updateCommand = new client_lambda_1.UpdateFunctionConfigurationCommand({
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
    isInCooldown(projectId) {
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
    getScalingThresholds(projectId) {
        // For now, return default thresholds
        // In production, you might have project-specific thresholds
        return this.defaultThresholds;
    }
    /**
     * Get default metrics when CloudWatch data is unavailable
     */
    getDefaultMetrics() {
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
    setScalingThresholds(projectId, thresholds) {
        // In production, this would persist to a database
        console.log(`Setting custom scaling thresholds for project ${projectId}:`, thresholds);
    }
    /**
     * Get scaling history for a project
     */
    getScalingHistory(projectId, limit = 100) {
        // In production, this would fetch from a database
        return [];
    }
    /**
     * Setup Kubernetes HPA (Horizontal Pod Autoscaler)
     */
    async setupKubernetesHPA(projectId, namespace, config) {
        try {
            const hpaManifest = this.generateHPAManifest(projectId, namespace, config);
            // Write manifest to temporary file
            const manifestPath = `/tmp/hpa-${projectId}-${Date.now()}.yaml`;
            await require('fs').promises.writeFile(manifestPath, hpaManifest);
            // Apply HPA manifest
            const command = `kubectl apply -f ${manifestPath}`;
            const { stdout, stderr } = await execAsync(command);
            if (stderr && !stderr.includes('created') && !stderr.includes('configured')) {
                throw new Error(stderr);
            }
            console.log(`HPA created for project ${projectId}:`, stdout);
            return { success: true };
        }
        catch (error) {
            console.error(`Failed to setup HPA for project ${projectId}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Setup Kubernetes VPA (Vertical Pod Autoscaler)
     */
    async setupKubernetesVPA(projectId, namespace, config) {
        try {
            const vpaManifest = this.generateVPAManifest(projectId, namespace, config);
            // Write manifest to temporary file
            const manifestPath = `/tmp/vpa-${projectId}-${Date.now()}.yaml`;
            await require('fs').promises.writeFile(manifestPath, vpaManifest);
            // Apply VPA manifest
            const command = `kubectl apply -f ${manifestPath}`;
            const { stdout, stderr } = await execAsync(command);
            if (stderr && !stderr.includes('created') && !stderr.includes('configured')) {
                throw new Error(stderr);
            }
            console.log(`VPA created for project ${projectId}:`, stdout);
            return { success: true };
        }
        catch (error) {
            console.error(`Failed to setup VPA for project ${projectId}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Setup custom metrics for scaling
     */
    async setupCustomMetrics(projectId, namespace, customMetrics) {
        try {
            // Create ServiceMonitor for Prometheus metrics
            const serviceMonitorManifest = this.generateServiceMonitorManifest(projectId, namespace);
            // Create PrometheusRule for custom metrics
            const prometheusRuleManifest = this.generatePrometheusRuleManifest(projectId, namespace, customMetrics);
            // Apply manifests
            const serviceMonitorPath = `/tmp/servicemonitor-${projectId}-${Date.now()}.yaml`;
            const prometheusRulePath = `/tmp/prometheusrule-${projectId}-${Date.now()}.yaml`;
            await require('fs').promises.writeFile(serviceMonitorPath, serviceMonitorManifest);
            await require('fs').promises.writeFile(prometheusRulePath, prometheusRuleManifest);
            const commands = [
                `kubectl apply -f ${serviceMonitorPath}`,
                `kubectl apply -f ${prometheusRulePath}`
            ];
            for (const command of commands) {
                const { stdout, stderr } = await execAsync(command);
                if (stderr && !stderr.includes('created') && !stderr.includes('configured')) {
                    console.warn(`Warning applying custom metrics: ${stderr}`);
                }
            }
            console.log(`Custom metrics setup completed for project ${projectId}`);
            return { success: true };
        }
        catch (error) {
            console.error(`Failed to setup custom metrics for project ${projectId}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get scaling recommendations based on historical data
     */
    async getScalingRecommendations(projectId, timeRange = '24h') {
        try {
            const endTime = new Date();
            const startTime = new Date(endTime.getTime() - this.getTimeRangeMs(timeRange));
            // Get historical metrics
            const [cpuMetrics, memoryMetrics, requestMetrics] = await Promise.all([
                this.getMetric('CPUUtilization', projectId, startTime, endTime),
                this.getMetric('MemoryUtilization', projectId, startTime, endTime),
                this.getMetric('RequestCount', projectId, startTime, endTime)
            ]);
            // Analyze patterns and provide recommendations
            const cpuRecommendation = this.analyzeCPUPattern(cpuMetrics);
            const memoryRecommendation = this.analyzeMemoryPattern(memoryMetrics);
            const replicasRecommendation = this.analyzeReplicasPattern(requestMetrics);
            return {
                cpuRecommendation,
                memoryRecommendation,
                replicasRecommendation
            };
        }
        catch (error) {
            console.error(`Failed to get scaling recommendations for project ${projectId}:`, error);
            return {
                cpuRecommendation: { current: 0, recommended: 0, reason: 'Unable to analyze' },
                memoryRecommendation: { current: 0, recommended: 0, reason: 'Unable to analyze' },
                replicasRecommendation: { current: 0, recommended: 0, reason: 'Unable to analyze' }
            };
        }
    }
    /**
     * Generate HPA manifest
     */
    generateHPAManifest(projectId, namespace, config) {
        return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${projectId}-hpa
  namespace: ${namespace}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${projectId}
  minReplicas: ${config.hpa.minReplicas}
  maxReplicas: ${config.hpa.maxReplicas}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: ${config.hpa.targetCPUUtilization}
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: ${config.hpa.targetMemoryUtilization}
${config.hpa.customMetrics.map(metric => `  - type: ${metric.type}
    ${metric.type.toLowerCase()}:
      metric:
        name: ${metric.name}
      target:
        type: AverageValue
        averageValue: "${metric.targetValue}"`).join('\n')}
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
`;
    }
    /**
     * Generate VPA manifest
     */
    generateVPAManifest(projectId, namespace, config) {
        return `apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: ${projectId}-vpa
  namespace: ${namespace}
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${projectId}
  updatePolicy:
    updateMode: ${config.vpa.updateMode}
  resourcePolicy:
    containerPolicies:
    - containerName: ${projectId}
      minAllowed:
        cpu: ${config.vpa.resourcePolicy.cpu.min}
        memory: ${config.vpa.resourcePolicy.memory.min}
      maxAllowed:
        cpu: ${config.vpa.resourcePolicy.cpu.max}
        memory: ${config.vpa.resourcePolicy.memory.max}
`;
    }
    /**
     * Generate ServiceMonitor manifest
     */
    generateServiceMonitorManifest(projectId, namespace) {
        return `apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ${projectId}-monitor
  namespace: ${namespace}
spec:
  selector:
    matchLabels:
      app: ${projectId}
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
`;
    }
    /**
     * Generate PrometheusRule manifest
     */
    generatePrometheusRuleManifest(projectId, namespace, customMetrics) {
        const rules = customMetrics.map(metric => `  - alert: ${metric.name}ScaleUp
    expr: ${metric.query} > ${metric.scaleUpThreshold}
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "${metric.name} scale up triggered"
      description: "${metric.name} is above threshold (${metric.scaleUpThreshold})"
  
  - alert: ${metric.name}ScaleDown
    expr: ${metric.query} < ${metric.scaleDownThreshold}
    for: 5m
    labels:
      severity: info
    annotations:
      summary: "${metric.name} scale down triggered"
      description: "${metric.name} is below threshold (${metric.scaleDownThreshold})"`).join('\n');
        return `apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ${projectId}-scaling-rules
  namespace: ${namespace}
spec:
  groups:
  - name: ${projectId}-scaling
    rules:
${rules}
`;
    }
    /**
     * Analyze CPU pattern for recommendations
     */
    analyzeCPUPattern(cpuUtilization) {
        if (cpuUtilization > 80) {
            return {
                current: cpuUtilization,
                recommended: Math.ceil(cpuUtilization * 1.5),
                reason: 'High CPU utilization detected, recommend increasing resources'
            };
        }
        else if (cpuUtilization < 20) {
            return {
                current: cpuUtilization,
                recommended: Math.max(1, Math.floor(cpuUtilization * 0.8)),
                reason: 'Low CPU utilization detected, recommend reducing resources'
            };
        }
        else {
            return {
                current: cpuUtilization,
                recommended: cpuUtilization,
                reason: 'CPU utilization is within optimal range'
            };
        }
    }
    /**
     * Analyze memory pattern for recommendations
     */
    analyzeMemoryPattern(memoryUtilization) {
        if (memoryUtilization > 85) {
            return {
                current: memoryUtilization,
                recommended: Math.ceil(memoryUtilization * 1.3),
                reason: 'High memory utilization detected, recommend increasing memory'
            };
        }
        else if (memoryUtilization < 30) {
            return {
                current: memoryUtilization,
                recommended: Math.max(1, Math.floor(memoryUtilization * 0.7)),
                reason: 'Low memory utilization detected, recommend reducing memory'
            };
        }
        else {
            return {
                current: memoryUtilization,
                recommended: memoryUtilization,
                reason: 'Memory utilization is within optimal range'
            };
        }
    }
    /**
     * Analyze replicas pattern for recommendations
     */
    analyzeReplicasPattern(requestCount) {
        // Simple heuristic based on request count
        const requestsPerReplica = 100; // Assume each replica can handle 100 requests
        const recommendedReplicas = Math.max(1, Math.ceil(requestCount / requestsPerReplica));
        return {
            current: 1, // This would be fetched from actual deployment
            recommended: recommendedReplicas,
            reason: `Based on ${requestCount} requests, recommend ${recommendedReplicas} replicas`
        };
    }
    /**
     * Get time range in milliseconds
     */
    getTimeRangeMs(timeRange) {
        const ranges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000
        };
        return ranges[timeRange];
    }
    /**
     * Clean up resources
     */
    async cleanup() {
        // Clean up AWS clients
        await this.cloudWatchClient.destroy();
        await this.ecsClient.destroy();
        await this.lambdaClient.destroy();
    }
}
exports.AutoScalingService = AutoScalingService;
exports.default = AutoScalingService;
