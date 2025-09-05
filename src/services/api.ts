/**
 * API Service Layer for DeployHub Frontend
 * Connects React frontend to FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp?: string;
}

export interface PrefectFlowRequest {
  flow_name: string;
  tasks?: Array<{
    name: string;
    type: string;
    config: Record<string, any>;
    dependencies?: string[];
  }>;
  // Single task fields for backward compatibility
  task_name?: string;
  task_type?: string;
  task_config?: Record<string, any>;
  dependencies?: string[];
  // Schedule configuration
  schedule_type?: string;
  schedule_value?: string;
  // Flow options
  retries?: number;
  timeout?: number;
  // Legacy fields
  schedule?: Record<string, any>;
  options?: Record<string, any>;
}

export interface ECSScaleRequest {
  resource_id: string;
  target_capacity: number;
  cluster_name?: string;
  service_name?: string;
  reason?: string;
}

export interface K8sScaleRequest {
  namespace: string;
  deployment_name: string;
  target_replicas?: number;
  replicas?: number; // Alternative field name
  reason?: string;
}

export interface LambdaScaleRequest {
  function_name: string;
  target_capacity: number;
  reason?: string;
}

export interface HPARequest {
  namespace: string;
  deployment_name: string;
  min_replicas?: number;
  max_replicas?: number;
  target_cpu?: number;
}

export interface PolicyCreateRequest {
  resource_id: string;
  resource_type: string;
  min_capacity?: number;
  max_capacity?: number;
  target_cpu?: number;
  scale_out_cooldown?: number;
  scale_in_cooldown?: number;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }

  // Root endpoint
  async getRoot(): Promise<ApiResponse> {
    return this.request('/');
  }

  // Prefect Flow Management
  async createPrefectFlow(flowData: PrefectFlowRequest): Promise<ApiResponse> {
    return this.request('/api/v1/prefect/create-flow', {
      method: 'POST',
      body: JSON.stringify(flowData),
    });
  }

  // ECS Scaling
  async scaleECSService(scaleData: ECSScaleRequest): Promise<ApiResponse> {
    return this.request('/api/v1/scaling/scale/ecs', {
      method: 'POST',
      body: JSON.stringify(scaleData),
    });
  }

  // Kubernetes Scaling
  async scaleKubernetesDeployment(scaleData: K8sScaleRequest): Promise<ApiResponse> {
    return this.request('/api/v1/scaling/scale/k8s', {
      method: 'POST',
      body: JSON.stringify(scaleData),
    });
  }

  // Lambda Scaling
  async scaleLambdaFunction(scaleData: LambdaScaleRequest): Promise<ApiResponse> {
    return this.request('/api/v1/scaling/scale/lambda', {
      method: 'POST',
      body: JSON.stringify(scaleData),
    });
  }

  // HPA Setup
  async setupHPA(hpaData: HPARequest): Promise<ApiResponse> {
    return this.request('/api/v1/scaling/setup-hpa', {
      method: 'POST',
      body: JSON.stringify(hpaData),
    });
  }

  // Auto-scaling Policy Management
  async createAutoscalingPolicy(
    resourceId: string,
    resourceType: string,
    config: Omit<PolicyCreateRequest, 'resource_id' | 'resource_type'> = {}
  ): Promise<ApiResponse> {
    const params = new URLSearchParams({
      resource_id: resourceId,
      resource_type: resourceType,
      ...Object.fromEntries(
        Object.entries(config).map(([key, value]) => [key, String(value)])
      ),
    });

    return this.request(`/api/v1/scaling/policy/create?${params}`, {
      method: 'POST',
    });
  }

  async deleteAutoscalingPolicy(
    resourceId: string,
    resourceType: string = 'ecs'
  ): Promise<ApiResponse> {
    const params = new URLSearchParams({
      resource_id: resourceId,
      resource_type: resourceType,
    });

    return this.request(`/api/v1/scaling/policy/${resourceId}?${params}`, {
      method: 'DELETE',
    });
  }

  // Metrics and Analysis
  async analyzeScalingMetrics(
    resourceId: string,
    resourceType: string = 'ecs'
  ): Promise<ApiResponse> {
    const params = new URLSearchParams({
      resource_id: resourceId,
      resource_type: resourceType,
    });

    return this.request(`/api/v1/scaling/analyze/${resourceId}?${params}`);
  }

  async getScalingMetrics(
    resourceId: string,
    resourceType: string = 'ecs'
  ): Promise<ApiResponse> {
    const params = new URLSearchParams({
      resource_id: resourceId,
      resource_type: resourceType,
    });

    return this.request(`/api/v1/scaling/metrics/${resourceId}?${params}`);
  }

  // Kubernetes Resources
  async getKubernetesDeployments(): Promise<ApiResponse> {
    return this.request('/api/v1/k8s/deployments');
  }

  async getKubernetesPods(): Promise<ApiResponse> {
    return this.request('/api/v1/k8s/pods');
  }

  async getKubernetesServices(): Promise<ApiResponse> {
    return this.request('/api/v1/k8s/services');
  }

  // Docker Resources
  async getDockerImages(): Promise<ApiResponse> {
    return this.request('/api/v1/docker/images');
  }

  async getDockerContainers(): Promise<ApiResponse> {
    return this.request('/api/v1/docker/containers');
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;
