import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useAWSStatus() {
  const [hasAWSConnection, setHasAWSConnection] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function checkAWSConnection() {
      if (!user) {
        setHasAWSConnection(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Check if user has any AWS connections
        const { data: connections, error } = await supabase
          .from('aws_connections')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'connected')
          .limit(1);

        if (error) {
          console.error('Error checking AWS connection status:', error);
          setError(error.message);
          setHasAWSConnection(false);
        } else {
          // User has AWS connection if there's at least one connected connection
          setHasAWSConnection(connections && connections.length > 0);
        }
      } catch (err) {
        console.error('Error checking AWS connection status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setHasAWSConnection(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAWSConnection();
  }, [user]);

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
