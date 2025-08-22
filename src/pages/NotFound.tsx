import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-destructive/10 p-4">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold mb-2">404</CardTitle>
              <CardDescription className="text-lg">
                Oops! The page you're looking for doesn't exist.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                The page at <code className="bg-muted px-2 py-1 rounded text-sm">{location.pathname}</code> was not found.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="outline">
                  <Link to="/">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
