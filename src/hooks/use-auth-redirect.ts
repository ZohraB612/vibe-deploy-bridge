import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAWSStatus } from "./use-aws-status";

export function useAuthRedirect() {
  const { isAuthenticated } = useAuth();
  const { hasAWSConnection, isLoading: isAWSLoading } = useAWSStatus();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If user is authenticated and on home page, redirect appropriately
    if (isAuthenticated && location.pathname === "/" && !isAWSLoading && hasAWSConnection !== null) {
      if (hasAWSConnection) {
        // User has AWS connection, redirect to dashboard
        navigate("/dashboard", { replace: true });
      } else {
        // User doesn't have AWS connection, redirect to AWS setup
        navigate("/setup/aws", { replace: true });
      }
    }
  }, [isAuthenticated, location.pathname, navigate, hasAWSConnection, isAWSLoading]);

  return { isAuthenticated, hasAWSConnection, isAWSLoading };
}

export function useRedirectAfterAuth() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectAfterAuth = () => {
    // Get the intended destination from state, or default to dashboard
    const from = (location.state as any)?.from?.pathname || "/dashboard";
    navigate(from, { replace: true });
  };

  return redirectAfterAuth;
}
