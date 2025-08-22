import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Cloud, 
  Globe, 
  Shield,
  Zap,
  Loader2
} from 'lucide-react';

export interface DeploymentStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  icon?: React.ReactNode;
  duration?: number;
  error?: string;
}

interface DeploymentProgressProps {
  steps: DeploymentStep[];
  currentStep: number;
  overallProgress: number;
  isDeploying: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
  estimatedTime?: number; // in seconds
}

const stepIcons = {
  'pending': Clock,
  'in-progress': Loader2,
  'completed': CheckCircle,
  'failed': AlertCircle
};

const stepColors = {
  'pending': 'text-muted-foreground',
  'in-progress': 'text-primary',
  'completed': 'text-green-600',
  'failed': 'text-red-600'
};

const stepBgColors = {
  'pending': 'bg-muted',
  'in-progress': 'bg-primary/10',
  'completed': 'bg-green-100',
  'failed': 'bg-red-100'
};

export function DeploymentProgress({
  steps,
  currentStep,
  overallProgress,
  isDeploying,
  onRetry,
  onCancel,
  estimatedTime
}: DeploymentProgressProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (isDeploying) {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isDeploying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepIcon = (step: DeploymentStep) => {
    if (step.icon) return step.icon;
    
    const IconComponent = stepIcons[step.status];
    return <IconComponent className={`h-5 w-5 ${stepColors[step.status]}`} />;
  };

  const getStepStatus = (step: DeploymentStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const hasFailedSteps = steps.some(step => step.status === 'failed');
  const isCompleted = steps.every(step => step.status === 'completed');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {isDeploying ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : isCompleted ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : hasFailedSteps ? (
            <AlertCircle className="h-6 w-6 text-red-600" />
          ) : (
            <Cloud className="h-6 w-6 text-primary" />
          )}
          {isDeploying ? 'Deploying...' : isCompleted ? 'Deployment Complete!' : 'Deployment Status'}
        </CardTitle>
        <CardDescription>
          {isDeploying 
            ? `Step ${currentStep + 1} of ${steps.length} • ${formatTime(timeElapsed)} elapsed`
            : isCompleted 
              ? 'Your application has been successfully deployed'
              : hasFailedSteps 
                ? 'Some steps failed during deployment'
                : 'Preparing deployment...'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Estimated Time */}
        {estimatedTime && isDeploying && (
          <div className="text-center text-sm text-muted-foreground">
            Estimated time remaining: {formatTime(Math.max(0, estimatedTime - timeElapsed))}
          </div>
        )}

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                stepBgColors[step.status]
              } ${step.status === 'in-progress' ? 'ring-2 ring-primary/20' : ''}`}
            >
              <div className={`p-2 rounded-full ${stepBgColors[step.status]} flex-shrink-0`}>
                {getStepIcon(step)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{step.name}</h4>
                  {getStepStatus(step)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                
                {step.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {step.error}
                  </div>
                )}
                
                {step.duration && step.status === 'completed' && (
                  <div className="text-xs text-muted-foreground">
                    Completed in {formatTime(step.duration)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 pt-4">
          {hasFailedSteps && onRetry && (
            <Button onClick={onRetry} variant="outline">
              <AlertCircle className="h-4 w-4 mr-2" />
              Retry Failed Steps
            </Button>
          )}
          
          {isDeploying && onCancel && (
            <Button onClick={onCancel} variant="destructive">
              Cancel Deployment
            </Button>
          )}
          
          {isCompleted && (
            <Button className="bg-green-600 hover:bg-green-700">
              <Globe className="h-4 w-4 mr-2" />
              View Live Site
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Default deployment steps for common scenarios
export const defaultDeploymentSteps: DeploymentStep[] = [
  {
    id: 'upload',
    name: 'Upload Files',
    description: 'Preparing and uploading your application files',
    status: 'pending',
    icon: <Cloud className="h-5 w-5" />
  },
  {
    id: 's3',
    name: 'Create S3 Bucket',
    description: 'Setting up storage for your application',
    status: 'pending',
    icon: <Cloud className="h-5 w-5" />
  },
  {
    id: 'cloudfront',
    name: 'Configure CDN',
    description: 'Setting up CloudFront for global distribution',
    status: 'pending',
    icon: <Globe className="h-5 w-5" />
  },
  {
    id: 'ssl',
    name: 'SSL Certificate',
    description: 'Provisioning SSL certificate for HTTPS',
    status: 'pending',
    icon: <Shield className="h-5 w-5" />
  },
  {
    id: 'deploy',
    name: 'Final Deployment',
    description: 'Making your application live',
    status: 'pending',
    icon: <Zap className="h-5 w-5" />
  }
];
