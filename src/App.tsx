import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/error-boundary";
import { ProtectedRoute } from "@/components/protected-route";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { AWSProvider } from "@/contexts/AWSContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { DeploymentLogsProvider } from "@/contexts/DeploymentLogsContext";
import { DomainProvider } from "@/contexts/DomainContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Deploy from "./pages/Deploy";
import AWSSetup from "./pages/AWSSetup";
import Settings from "./pages/Settings";
import ProjectDetails from "./pages/ProjectDetails";
import DomainManagement from "./pages/DomainManagement";
import AuthCallback from "./pages/AuthCallback";
import EnhancedDashboard from "./pages/EnhancedDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AWSProvider>
                      <ProjectProvider>
              <AnalyticsProvider>
                <DeploymentLogsProvider>
                  <DomainProvider>
                    <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/enhanced-dashboard" 
              element={
                <ProtectedRoute>
                  <EnhancedDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/deploy" 
              element={
                <ProtectedRoute>
                  <Deploy />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/setup/aws" 
              element={
                <ProtectedRoute>
                  <AWSSetup />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/project/:id" 
              element={
                <ProtectedRoute>
                  <ProjectDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/domains" 
              element={
                <ProtectedRoute>
                  <DomainManagement />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
                    </Routes>
                  </TooltipProvider>
                </DomainProvider>
              </DeploymentLogsProvider>
            </AnalyticsProvider>
          </ProjectProvider>
        </AWSProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
