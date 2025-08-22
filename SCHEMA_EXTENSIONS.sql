-- 🚀 DeployHub Extended Schema for Real Analytics & Management
-- Add these tables to your existing Supabase database

-- Analytics Data Storage
CREATE TABLE project_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_type TEXT NOT NULL, -- 'performance', 'traffic', 'error', 'uptime'
  metric_name TEXT NOT NULL, -- 'response_time', 'visitors', 'errors', 'availability'
  value DECIMAL NOT NULL,
  unit TEXT, -- 'ms', 'count', 'percentage', 'bytes'
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  CONSTRAINT unique_metric_timestamp UNIQUE (project_id, metric_type, metric_name, timestamp)
);

-- Deployment Logs Storage
CREATE TABLE deployment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_level TEXT CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'success')) NOT NULL,
  message TEXT NOT NULL,
  source TEXT, -- 'build', 'deploy', 'aws', 'system'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Environment Variables Management
CREATE TABLE project_environment_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_name TEXT NOT NULL,
  value_encrypted TEXT NOT NULL, -- Encrypted value
  environment TEXT CHECK (environment IN ('development', 'staging', 'production')) DEFAULT 'production',
  is_secret BOOLEAN DEFAULT false,
  CONSTRAINT unique_env_var UNIQUE (project_id, key_name, environment)
);

-- Domain Management
CREATE TABLE project_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain_name TEXT NOT NULL UNIQUE,
  domain_type TEXT CHECK (domain_type IN ('subdomain', 'custom', 'apex')) NOT NULL,
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'failed')) DEFAULT 'pending',
  ssl_status TEXT CHECK (ssl_status IN ('pending', 'issued', 'failed', 'expired')) DEFAULT 'pending',
  dns_records JSONB, -- Store required DNS records
  ssl_certificate_arn TEXT,
  cloudfront_distribution_id TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  ssl_issued_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Performance Monitoring Alerts
CREATE TABLE performance_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL, -- 'uptime', 'response_time', 'error_rate'
  threshold_value DECIMAL NOT NULL,
  comparison_operator TEXT CHECK (comparison_operator IN ('>', '<', '>=', '<=', '=')) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notification_channels JSONB -- email, slack, etc.
);

-- Triggered alerts log
CREATE TABLE alert_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  alert_id UUID REFERENCES performance_alerts(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  triggered_value DECIMAL NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  notification_sent BOOLEAN DEFAULT false
);

-- Real-time monitoring endpoints
CREATE TABLE monitoring_endpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint_url TEXT NOT NULL,
  check_interval INTEGER DEFAULT 300, -- seconds
  timeout_duration INTEGER DEFAULT 30, -- seconds
  is_active BOOLEAN DEFAULT true,
  last_check_at TIMESTAMP WITH TIME ZONE,
  last_status_code INTEGER,
  last_response_time INTEGER -- milliseconds
);

-- Row Level Security Policies

-- Analytics: Users can only see their own project analytics
CREATE POLICY "Users can view own project analytics" ON project_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own project analytics" ON project_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Deployment Logs: Users can only see their own deployment logs
CREATE POLICY "Users can view own deployment logs" ON deployment_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deployment logs" ON deployment_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Environment Variables: Users can only manage their own project env vars
CREATE POLICY "Users can view own env vars" ON project_environment_variables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own env vars" ON project_environment_variables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own env vars" ON project_environment_variables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own env vars" ON project_environment_variables FOR DELETE USING (auth.uid() = user_id);

-- Domains: Users can only manage their own project domains
CREATE POLICY "Users can view own domains" ON project_domains FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own domains" ON project_domains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own domains" ON project_domains FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own domains" ON project_domains FOR DELETE USING (auth.uid() = user_id);

-- Performance Alerts: Users can only manage their own alerts
CREATE POLICY "Users can view own alerts" ON performance_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON performance_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON performance_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON performance_alerts FOR DELETE USING (auth.uid() = user_id);

-- Alert Triggers: Users can view their own alert triggers
CREATE POLICY "Users can view own alert triggers" ON alert_triggers FOR SELECT USING (auth.uid() = (SELECT user_id FROM performance_alerts WHERE id = alert_id));

-- Monitoring Endpoints: Users can only manage their own endpoints
CREATE POLICY "Users can view own endpoints" ON monitoring_endpoints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own endpoints" ON monitoring_endpoints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own endpoints" ON monitoring_endpoints FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own endpoints" ON monitoring_endpoints FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on all new tables
ALTER TABLE project_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_environment_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_endpoints ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_analytics_project_metric ON project_analytics(project_id, metric_type, metric_name, timestamp);
CREATE INDEX idx_analytics_timestamp ON project_analytics(timestamp);
CREATE INDEX idx_deployment_logs_deployment ON deployment_logs(deployment_id, timestamp);
CREATE INDEX idx_deployment_logs_project ON deployment_logs(project_id, timestamp);
CREATE INDEX idx_env_vars_project ON project_environment_variables(project_id, environment);
CREATE INDEX idx_domains_project ON project_domains(project_id, verification_status);
CREATE INDEX idx_alerts_project ON performance_alerts(project_id, is_active);
CREATE INDEX idx_endpoints_project ON monitoring_endpoints(project_id, is_active);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables with updated_at columns
CREATE TRIGGER update_project_environment_variables_updated_at
    BEFORE UPDATE ON project_environment_variables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_domains_updated_at
    BEFORE UPDATE ON project_domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_endpoints_updated_at
    BEFORE UPDATE ON monitoring_endpoints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
