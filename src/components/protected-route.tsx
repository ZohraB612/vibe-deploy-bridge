import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, User } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ 
  children, 
  fallback,
  requireAuth = true 
}: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Save the current location for redirect after authentication
  useEffect(() => {
    if (!isAuthenticated && requireAuth) {
      // Store the attempted location
      localStorage.setItem('redirect_after_auth', location.pathname);
    } else if (isAuthenticated) {
      // Clear any stored redirect
      localStorage.removeItem('redirect_after_auth');
    }
  }, [isAuthenticated, requireAuth, location.pathname]);

  if (!requireAuth || isAuthenticated) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication Required
          </CardTitle>
          <CardDescription>
            You need to sign in to access this page. Please log in with your account or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Button 
              onClick={() => setShowAuth(true)}
              className="w-full bg-gradient-primary hover:shadow-glow"
            >
              <User className="h-4 w-4 mr-2" />
              Sign In to Continue
            </Button>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              New to DeployHub?{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto font-medium"
                onClick={() => setShowAuth(true)}
              >
                Create an account
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
      
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );
}
