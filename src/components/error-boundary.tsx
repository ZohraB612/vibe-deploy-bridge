import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundaryClass extends Component<Props & { navigate: (path: string) => void }, State> {
  constructor(props: Props & { navigate: (path: string) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Log error to external service in production
    if (process.env.NODE_ENV === 'production') {
      // You could send this to Sentry, LogRocket, etc.
      console.error('Production error:', { error: error.message, stack: error.stack, errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    this.props.navigate('/');
    this.handleRetry();
  };

  handleGoBack = () => {
    window.history.back();
    this.handleRetry();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-subtle">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-red-100 p-4">
                  <AlertTriangle className="h-12 w-12 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-red-600">
                Something went wrong
              </CardTitle>
              <CardDescription>
                We encountered an unexpected error. Don't worry, your data is safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="text-left">
                  <details className="bg-muted p-3 rounded text-sm">
                    <summary className="cursor-pointer font-medium mb-2">
                      Error Details (Development)
                    </summary>
                    <div className="space-y-2 text-xs font-mono">
                      <p><strong>Message:</strong> {this.state.error.message}</p>
                      <p><strong>Stack:</strong></p>
                      <pre className="whitespace-pre-wrap text-xs bg-background p-2 rounded">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
              
              <div className="space-y-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleGoBack} className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                If this problem persists, please contact support with the error details above.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to provide navigation function
export function ErrorBoundary({ children, fallback }: Props) {
  const navigate = useNavigate();
  return (
    <ErrorBoundaryClass navigate={navigate} fallback={fallback}>
      {children}
    </ErrorBoundaryClass>
  );
}