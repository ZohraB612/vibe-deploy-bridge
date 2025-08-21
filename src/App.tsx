import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/error-boundary";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Deploy from "./pages/Deploy";
import AWSSetup from "./pages/AWSSetup";
import Settings from "./pages/Settings";
import ProjectDetails from "./pages/ProjectDetails";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/deploy" element={<Deploy />} />
            <Route path="/setup/aws" element={<AWSSetup />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/project/:id" element={<ProjectDetails />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
