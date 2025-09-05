import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAWS } from '@/contexts/AWSContext';

export function useAWSStatus() {
  const [hasAWSConnection, setHasAWSConnection] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { connection } = useAWS();

  useEffect(() => {
    // useAWSStatus useEffect - only runs when user or connection ID changes
    async function checkAWSConnection() {
      if (!user) {
        setHasAWSConnection(false);
        setIsLoading(false);
        return;
      }

      // First check if AWS context already has a connection
      if (connection && connection.is_active) {
        setHasAWSConnection(true);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Check if user has any AWS connections in database
        const { data: connections, error } = await supabase
          .from('aws_connections')
          .select('id, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);

        if (error) {
          console.warn('Supabase connection issue, continuing without AWS status check:', error);
          setError(null);
          // Default to false when Supabase is unavailable
          setHasAWSConnection(false);
        } else {
          // User has AWS connection if there's at least one connected connection
          const hasConnection = connections && connections.length > 0;
          console.log('🔍 useAWSStatus Database Check:', {
            connections,
            hasConnection,
            userId: user.id
          });
          setHasAWSConnection(hasConnection);
        }
      } catch (err) {
        console.warn('Supabase connection issue, continuing without AWS status check:', err);
        setError(null);
        setHasAWSConnection(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAWSConnection();
  }, [user?.id, connection?.id]); // Only depend on IDs, not entire objects

  return {
    hasAWSConnection,
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true);
      setHasAWSConnection(null);
      setError(null);
      // This will trigger the useEffect to run again
    }
  };
}
