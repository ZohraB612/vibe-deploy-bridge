// Database types for Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          name: string | null
          avatar_url: string | null
          provider: string | null
          metadata: Json | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          name?: string | null
          avatar_url?: string | null
          provider?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          provider?: string | null
          metadata?: Json | null
        }
      }
      projects: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          name: string
          description: string | null
          domain: string
          status: 'deployed' | 'deploying' | 'failed' | 'building' | 'stopped'
          framework: string
          branch: string
          build_time: string | null
          size: string | null
          deployment_count: number
          last_deployed_at: string | null
          aws_bucket: string | null
          aws_region: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          name: string
          description?: string | null
          domain: string
          status?: 'deployed' | 'deploying' | 'failed' | 'building' | 'stopped'
          framework: string
          branch?: string
          build_time?: string | null
          size?: string | null
          deployment_count?: number
          last_deployed_at?: string | null
          aws_bucket?: string | null
          aws_region?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          name?: string
          description?: string | null
          domain?: string
          status?: 'deployed' | 'deploying' | 'failed' | 'building' | 'stopped'
          framework?: string
          branch?: string
          build_time?: string | null
          size?: string | null
          deployment_count?: number
          last_deployed_at?: string | null
          aws_bucket?: string | null
          aws_region?: string | null
          metadata?: Json | null
        }
      }
      deployments: {
        Row: {
          id: string
          created_at: string
          project_id: string
          user_id: string
          status: 'pending' | 'building' | 'deploying' | 'success' | 'failed'
          commit_hash: string | null
          branch: string
          build_logs: string | null
          deploy_url: string | null
          build_time: number | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          user_id: string
          status?: 'pending' | 'building' | 'deploying' | 'success' | 'failed'
          commit_hash?: string | null
          branch?: string
          build_logs?: string | null
          deploy_url?: string | null
          build_time?: number | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          user_id?: string
          status?: 'pending' | 'building' | 'deploying' | 'success' | 'failed'
          commit_hash?: string | null
          branch?: string
          build_logs?: string | null
          deploy_url?: string | null
          build_time?: number | null
          metadata?: Json | null
        }
      }
      aws_connections: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          account_id: string
          role_arn: string
          external_id: string
          region: string
          is_active: boolean
          last_validated_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          account_id: string
          role_arn: string
          external_id: string
          region?: string
          is_active?: boolean
          last_validated_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          account_id?: string
          role_arn?: string
          external_id?: string
          region?: string
          is_active?: boolean
          last_validated_at?: string | null
          metadata?: Json | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      deployment_status: 'pending' | 'building' | 'deploying' | 'success' | 'failed'
      project_status: 'deployed' | 'deploying' | 'failed' | 'building' | 'stopped'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Deployment = Database['public']['Tables']['deployments']['Row']
export type AWSConnection = Database['public']['Tables']['aws_connections']['Row']

// New analytics and management types
export type ProjectAnalytics = Database['public']['Tables']['project_analytics']['Row']
export type DeploymentLog = Database['public']['Tables']['deployment_logs']['Row']
export type ProjectEnvironmentVariable = Database['public']['Tables']['project_environment_variables']['Row']
export type ProjectDomain = Database['public']['Tables']['project_domains']['Row']
export type PerformanceAlert = Database['public']['Tables']['performance_alerts']['Row']
export type AlertTrigger = Database['public']['Tables']['alert_triggers']['Row']
export type MonitoringEndpoint = Database['public']['Tables']['monitoring_endpoints']['Row']

export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type DeploymentInsert = Database['public']['Tables']['deployments']['Insert']
export type AWSConnectionInsert = Database['public']['Tables']['aws_connections']['Insert']
export type ProjectAnalyticsInsert = Database['public']['Tables']['project_analytics']['Insert']
export type DeploymentLogInsert = Database['public']['Tables']['deployment_logs']['Insert']
export type ProjectEnvironmentVariableInsert = Database['public']['Tables']['project_environment_variables']['Insert']
export type ProjectDomainInsert = Database['public']['Tables']['project_domains']['Insert']
export type PerformanceAlertInsert = Database['public']['Tables']['performance_alerts']['Insert']
export type MonitoringEndpointInsert = Database['public']['Tables']['monitoring_endpoints']['Insert']

export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']
export type DeploymentUpdate = Database['public']['Tables']['deployments']['Update']
export type AWSConnectionUpdate = Database['public']['Tables']['aws_connections']['Update']
export type ProjectAnalyticsUpdate = Database['public']['Tables']['project_analytics']['Update']
export type DeploymentLogUpdate = Database['public']['Tables']['deployment_logs']['Update']
export type ProjectEnvironmentVariableUpdate = Database['public']['Tables']['project_environment_variables']['Update']
export type ProjectDomainUpdate = Database['public']['Tables']['project_domains']['Update']
export type PerformanceAlertUpdate = Database['public']['Tables']['performance_alerts']['Update']
export type MonitoringEndpointUpdate = Database['public']['Tables']['monitoring_endpoints']['Update']
