"""
Real Auto-Scaling Service with AWS integration
"""

import boto3
import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from app.core.logging import get_logger

logger = get_logger(__name__)

@dataclass
class ScalingDecision:
    """Scaling decision result"""
    direction: str  # 'up', 'down', 'none'
    target_capacity: int
    reason: str
    confidence: float
    metrics: Dict[str, Any]

class AutoScalingService:
    """Service for managing auto-scaling across different platforms"""
    
    def __init__(self):
        self.ecs_client = boto3.client('ecs')
        self.lambda_client = boto3.client('lambda')
        self.cloudwatch_client = boto3.client('cloudwatch')
        self.application_autoscaling_client = boto3.client('application-autoscaling')
    
    async def scale_ecs_service(self, cluster_name: str, service_name: str, decision: ScalingDecision) -> Dict[str, Any]:
        """Scale ECS service based on decision"""
        try:
            logger.info(f"Scaling ECS service {service_name} to {decision.target_capacity} tasks")
            
            # Update service desired count
            response = self.ecs_client.update_service(
                cluster=cluster_name,
                service=service_name,
                desiredCount=decision.target_capacity
            )
            
            # Wait for service to stabilize
            waiter = self.ecs_client.get_waiter('services_stable')
            waiter.wait(
                cluster=cluster_name,
                services=[service_name],
                WaiterConfig={'Delay': 10, 'MaxAttempts': 30}
            )
            
            return {
                "success": True,
                "service_name": service_name,
                "cluster_name": cluster_name,
                "target_capacity": decision.target_capacity,
                "current_capacity": response['service']['runningCount'],
                "reason": decision.reason
            }
            
        except Exception as e:
            logger.error(f"ECS scaling failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "service_name": service_name
            }
    
    async def scale_lambda_function(self, function_name: str, decision: ScalingDecision) -> Dict[str, Any]:
        """Scale Lambda function based on decision"""
        try:
            logger.info(f"Scaling Lambda function {function_name}")
            
            # For Lambda, we adjust reserved concurrency
            if decision.direction == 'up':
                # Increase reserved concurrency
                new_concurrency = min(decision.target_capacity * 10, 1000)  # Max 1000
                
                response = self.lambda_client.put_reserved_concurrency_config(
                    FunctionName=function_name,
                    ReservedConcurrencyLimit=new_concurrency
                )
                
                return {
                    "success": True,
                    "function_name": function_name,
                    "reserved_concurrency": new_concurrency,
                    "reason": decision.reason
                }
            else:
                # Decrease reserved concurrency
                new_concurrency = max(decision.target_capacity * 5, 10)  # Min 10
                
                response = self.lambda_client.put_reserved_concurrency_config(
                    FunctionName=function_name,
                    ReservedConcurrencyLimit=new_concurrency
                )
                
                return {
                    "success": True,
                    "function_name": function_name,
                    "reserved_concurrency": new_concurrency,
                    "reason": decision.reason
                }
                
        except Exception as e:
            logger.error(f"Lambda scaling failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "function_name": function_name
            }
    
    async def scale_kubernetes_deployment(self, namespace: str, deployment_name: str, decision: ScalingDecision) -> Dict[str, Any]:
        """Scale Kubernetes deployment based on decision"""
        try:
            logger.info(f"Scaling Kubernetes deployment {deployment_name} to {decision.target_capacity} replicas")
            
            import subprocess
            
            # Scale deployment using kubectl
            cmd = [
                "kubectl", "scale", "deployment", deployment_name,
                f"--replicas={decision.target_capacity}",
                f"-n={namespace}"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            return {
                "success": True,
                "deployment_name": deployment_name,
                "namespace": namespace,
                "target_replicas": decision.target_capacity,
                "reason": decision.reason,
                "output": result.stdout
            }
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Kubernetes scaling failed: {e}")
            return {
                "success": False,
                "error": e.stderr,
                "deployment_name": deployment_name
            }
    
    async def analyze_scaling_metrics(self, resource_id: str, resource_type: str) -> ScalingDecision:
        """Analyze metrics and make scaling decision"""
        try:
            # Get CloudWatch metrics
            end_time = time.time()
            start_time = end_time - 300  # Last 5 minutes
            
            metrics = await self.get_cloudwatch_metrics(resource_id, resource_type, start_time, end_time)
            
            # Analyze CPU utilization
            cpu_utilization = metrics.get('cpu_utilization', 0)
            memory_utilization = metrics.get('memory_utilization', 0)
            request_count = metrics.get('request_count', 0)
            
            # Make scaling decision based on metrics
            if cpu_utilization > 80 or memory_utilization > 85:
                # Scale up
                current_capacity = metrics.get('current_capacity', 1)
                target_capacity = min(current_capacity * 2, 20)  # Max 20 instances
                
                return ScalingDecision(
                    direction='up',
                    target_capacity=target_capacity,
                    reason=f"High resource utilization: CPU {cpu_utilization:.1f}%, Memory {memory_utilization:.1f}%",
                    confidence=0.9,
                    metrics=metrics
                )
            elif cpu_utilization < 20 and memory_utilization < 30 and request_count < 10:
                # Scale down
                current_capacity = metrics.get('current_capacity', 1)
                target_capacity = max(current_capacity // 2, 1)  # Min 1 instance
                
                return ScalingDecision(
                    direction='down',
                    target_capacity=target_capacity,
                    reason=f"Low resource utilization: CPU {cpu_utilization:.1f}%, Memory {memory_utilization:.1f}%",
                    confidence=0.8,
                    metrics=metrics
                )
            else:
                # No scaling needed
                return ScalingDecision(
                    direction='none',
                    target_capacity=metrics.get('current_capacity', 1),
                    reason="Resource utilization within normal range",
                    confidence=0.7,
                    metrics=metrics
                )
                
        except Exception as e:
            logger.error(f"Metrics analysis failed: {e}")
            return ScalingDecision(
                direction='none',
                target_capacity=1,
                reason=f"Metrics analysis failed: {str(e)}",
                confidence=0.0,
                metrics={}
            )
    
    async def get_cloudwatch_metrics(self, resource_id: str, resource_type: str, start_time: float, end_time: float) -> Dict[str, Any]:
        """Get CloudWatch metrics for resource"""
        try:
            metrics = {}
            
            if resource_type == 'ecs':
                # Get ECS service metrics
                response = self.cloudwatch_client.get_metric_statistics(
                    Namespace='AWS/ECS',
                    MetricName='CPUUtilization',
                    Dimensions=[
                        {'Name': 'ServiceName', 'Value': resource_id},
                        {'Name': 'ClusterName', 'Value': 'default'}
                    ],
                    StartTime=time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(start_time)),
                    EndTime=time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(end_time)),
                    Period=300,
                    Statistics=['Average']
                )
                
                if response['Datapoints']:
                    metrics['cpu_utilization'] = response['Datapoints'][-1]['Average']
                
                # Get memory utilization
                response = self.cloudwatch_client.get_metric_statistics(
                    Namespace='AWS/ECS',
                    MetricName='MemoryUtilization',
                    Dimensions=[
                        {'Name': 'ServiceName', 'Value': resource_id},
                        {'Name': 'ClusterName', 'Value': 'default'}
                    ],
                    StartTime=time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(start_time)),
                    EndTime=time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(end_time)),
                    Period=300,
                    Statistics=['Average']
                )
                
                if response['Datapoints']:
                    metrics['memory_utilization'] = response['Datapoints'][-1]['Average']
                
                # Get current capacity
                ecs_response = self.ecs_client.describe_services(
                    cluster='default',
                    services=[resource_id]
                )
                
                if ecs_response['services']:
                    metrics['current_capacity'] = ecs_response['services'][0]['runningCount']
            
            elif resource_type == 'lambda':
                # Get Lambda metrics
                response = self.cloudwatch_client.get_metric_statistics(
                    Namespace='AWS/Lambda',
                    MetricName='Duration',
                    Dimensions=[
                        {'Name': 'FunctionName', 'Value': resource_id}
                    ],
                    StartTime=time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(start_time)),
                    EndTime=time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(end_time)),
                    Period=300,
                    Statistics=['Average']
                )
                
                if response['Datapoints']:
                    metrics['duration'] = response['Datapoints'][-1]['Average']
                
                # Get invocation count
                response = self.cloudwatch_client.get_metric_statistics(
                    Namespace='AWS/Lambda',
                    MetricName='Invocations',
                    Dimensions=[
                        {'Name': 'FunctionName', 'Value': resource_id}
                    ],
                    StartTime=time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(start_time)),
                    EndTime=time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(end_time)),
                    Period=300,
                    Statistics=['Sum']
                )
                
                if response['Datapoints']:
                    metrics['request_count'] = response['Datapoints'][-1]['Sum']
                    metrics['current_capacity'] = min(metrics['request_count'], 100)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get CloudWatch metrics: {e}")
            return {}
    
    async def create_autoscaling_policy(self, resource_id: str, resource_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Create auto-scaling policy for resource"""
        try:
            if resource_type == 'ecs':
                # Create ECS service auto-scaling policy
                response = self.application_autoscaling_client.register_scalable_target(
                    ServiceNamespace='ecs',
                    ResourceId=f'service/default/{resource_id}',
                    ScalableDimension='ecs:service:DesiredCount',
                    MinCapacity=config.get('min_capacity', 1),
                    MaxCapacity=config.get('max_capacity', 10)
                )
                
                # Create scaling policy
                policy_response = self.application_autoscaling_client.put_scaling_policy(
                    ServiceNamespace='ecs',
                    ResourceId=f'service/default/{resource_id}',
                    ScalableDimension='ecs:service:DesiredCount',
                    PolicyName=f'{resource_id}-scaling-policy',
                    PolicyType='TargetTrackingScaling',
                    TargetTrackingScalingPolicyConfiguration={
                        'TargetValue': config.get('target_cpu', 70.0),
                        'PredefinedMetricSpecification': {
                            'PredefinedMetricType': 'ECSServiceAverageCPUUtilization'
                        },
                        'ScaleOutCooldown': config.get('scale_out_cooldown', 300),
                        'ScaleInCooldown': config.get('scale_in_cooldown', 300)
                    }
                )
                
                return {
                    "success": True,
                    "resource_id": resource_id,
                    "policy_arn": policy_response['PolicyARN'],
                    "target_arn": response['ScalableTargetARN']
                }
            
            return {"success": False, "error": f"Unsupported resource type: {resource_type}"}
            
        except Exception as e:
            logger.error(f"Failed to create auto-scaling policy: {e}")
            return {
                "success": False,
                "error": str(e),
                "resource_id": resource_id
            }
    
    async def delete_autoscaling_policy(self, resource_id: str, resource_type: str) -> Dict[str, Any]:
        """Delete auto-scaling policy for resource"""
        try:
            if resource_type == 'ecs':
                # Delete scaling policy
                self.application_autoscaling_client.delete_scaling_policy(
                    ServiceNamespace='ecs',
                    ResourceId=f'service/default/{resource_id}',
                    ScalableDimension='ecs:service:DesiredCount',
                    PolicyName=f'{resource_id}-scaling-policy'
                )
                
                # Deregister scalable target
                self.application_autoscaling_client.deregister_scalable_target(
                    ServiceNamespace='ecs',
                    ResourceId=f'service/default/{resource_id}',
                    ScalableDimension='ecs:service:DesiredCount'
                )
                
                return {
                    "success": True,
                    "resource_id": resource_id,
                    "message": "Auto-scaling policy deleted successfully"
                }
            
            return {"success": False, "error": f"Unsupported resource type: {resource_type}"}
            
        except Exception as e:
            logger.error(f"Failed to delete auto-scaling policy: {e}")
            return {
                "success": False,
                "error": str(e),
                "resource_id": resource_id
            }
