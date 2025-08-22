import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useAWSStatus } from '@/hooks/use-aws-status';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, ArrowLeft, Cloud } from 'lucide-react';

export default function AuthCallback() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [redirectDestination, setRedirectDestination] = useState<string>('/dashboard');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { hasAWSConnection, isLoading: isAWSLoading } = useAWSStatus();
  const { toast } = useToast();

  useEffect(() => {
    console.log('AuthCallback: Auth state update', { 
      isAuthenticated, 
      user: !!user, 
      userEmail: user?.email, 
      isLoading,
      isProcessing,
      hasAWSConnection,
      isAWSLoading
    });
    
    // Check for URL errors first
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (errorParam && errorParam !== 'server_error') {
      console.log('AuthCallback: OAuth error detected', { errorParam, errorDescription });
      setError(errorDescription || errorParam);
      setIsProcessing(false);
      return;
    }

    // If user is authenticated and not loading, and AWS status is determined
    if (isAuthenticated && user && !isLoading && !isAWSLoading && hasAWSConnection !== null) {
      console.log('AuthCallback: User authenticated and AWS status determined!', {
        user: user.email,
        hasAWSConnection
      });
      
      setSuccess(true);
      setIsProcessing(false);
      
      // Determine redirect destination based on AWS connection status
      if (hasAWSConnection) {
        setRedirectDestination('/dashboard');
        toast({
          title: 'Welcome back!',
          description: `Successfully signed in as ${user.email}`,
        });
      } else {
        setRedirectDestination('/setup/aws');
        toast({
          title: 'Welcome to DeployHub!',
          description: `Let's get your AWS account connected to start deploying`,
        });
      }
      
      // Delay redirect to show success state
      setTimeout(() => {
        navigate(redirectDestination, { replace: true });
      }, 2000);
    }
  }, [isAuthenticated, user, isLoading, searchParams, toast, hasAWSConnection, isAWSLoading, navigate, redirectDestination]);

  // Separate effect to handle timeout (only if still processing after 20 seconds)
  useEffect(() => {
    if (isProcessing && !isAuthenticated && !error && !success && !isLoading) {
      const timeoutTimer = setTimeout(() => {
        console.log('AuthCallback: Timeout reached, checking final auth state...', {
          isAuthenticated, user: !!user, isLoading, isProcessing
        });
        if (!isAuthenticated && !success && !isLoading) {
          console.error('AuthCallback: Authentication timeout');
          setError('Authentication timeout - please try again');
          setIsProcessing(false);
        }
      }, 20000); // 20 second timeout

      return () => clearTimeout(timeoutTimer);
    }
  }, [isProcessing, isAuthenticated, error, success, isLoading, user]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <LoadingSpinner size="lg" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Signing you in...</CardTitle>
            <CardDescription>
              Please wait while we complete your authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Verifying your credentials</p>
              <p>✓ Setting up your session</p>
              <p>• Checking your AWS connection...</p>
              <p>• Redirecting to {redirectDestination === '/dashboard' ? 'dashboard' : 'AWS setup'}...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    const isNewUser = !hasAWSConnection;
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className={`rounded-full p-4 ${isNewUser ? 'bg-blue-100' : 'bg-green-100'}`}>
                {isNewUser ? (
                  <Cloud className="h-12 w-12 text-blue-600" />
                ) : (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                )}
              </div>
            </div>
            <CardTitle className={`text-2xl font-bold ${isNewUser ? 'text-blue-600' : 'text-green-600'}`}>
              {isNewUser ? 'Welcome to DeployHub!' : 'Welcome back!'}
            </CardTitle>
            <CardDescription>
              {isNewUser 
                ? "You're all set up! Let's connect your AWS account to start deploying."
                : "You've been successfully signed in"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{user.profile?.name || user.email}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {isNewUser 
                ? "Redirecting you to AWS setup..."
                : "Redirecting you to your dashboard..."
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-red-600">Authentication Failed</CardTitle>
            <CardDescription>
              We couldn't sign you in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
