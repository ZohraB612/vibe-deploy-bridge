import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface RetryMechanismProps {
  operation: () => Promise<any>;
  onSuccess?: (result: any) => void;
  onFailure?: (error: Error, attempt: number) => void;
  onRetry?: (attempt: number) => void;
  config?: Partial<RetryConfig>;
  children: (props: RetryRenderProps) => React.ReactNode;
  className?: string;
}

interface RetryRenderProps {
  execute: () => Promise<void>;
  isExecuting: boolean;
  attempt: number;
  lastError: Error | null;
  retry: () => void;
  reset: () => void;
}

const defaultConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

export function RetryMechanism({
  operation,
  onSuccess,
  onFailure,
  onRetry,
  config = {},
  children,
  className
}: RetryMechanismProps) {
  const finalConfig = { ...defaultConfig, ...config };
  const [isExecuting, setIsExecuting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const calculateDelay = useCallback((attemptNumber: number): number => {
    const delay = finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attemptNumber);
    return Math.min(delay, finalConfig.maxDelay);
  }, [finalConfig]);

  const execute = useCallback(async () => {
    setIsExecuting(true);
    setLastError(null);
    setAttempt(0);

    for (let currentAttempt = 0; currentAttempt < finalConfig.maxAttempts; currentAttempt++) {
      setAttempt(currentAttempt + 1);
      
      try {
        const result = await operation();
        setIsExecuting(false);
        setLastError(null);
        onSuccess?.(result);
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        setLastError(errorObj);
        
        if (currentAttempt === finalConfig.maxAttempts - 1) {
          // Final attempt failed
          setIsExecuting(false);
          onFailure?.(errorObj, currentAttempt + 1);
          throw errorObj;
        } else {
          // Not the final attempt, retry after delay
          onRetry?.(currentAttempt + 1);
          const delay = calculateDelay(currentAttempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }, [operation, finalConfig, onSuccess, onFailure, onRetry, calculateDelay]);

  const retry = useCallback(() => {
    if (!isExecuting) {
      execute();
    }
  }, [execute, isExecuting]);

  const reset = useCallback(() => {
    setIsExecuting(false);
    setAttempt(0);
    setLastError(null);
  }, []);

  return (
    <div className={className}>
      {children({
        execute,
        isExecuting,
        attempt,
        lastError,
        retry,
        reset
      })}
    </div>
  );
}

// Pre-built retry components
interface RetryButtonProps {
  operation: () => Promise<any>;
  onSuccess?: (result: any) => void;
  onFailure?: (error: Error, attempt: number) => void;
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  maxAttempts?: number;
}

export function RetryButton({
  operation,
  onSuccess,
  onFailure,
  children,
  variant = 'default',
  size = 'default',
  className,
  disabled = false,
  maxAttempts = 3
}: RetryButtonProps) {
  return (
    <RetryMechanism
      operation={operation}
      onSuccess={onSuccess}
      onFailure={onFailure}
      config={{ maxAttempts }}
    >
      {({ execute, isExecuting, attempt, lastError, retry }) => (
        <div className="space-y-2">
          <Button
            onClick={execute}
            disabled={disabled || isExecuting}
            variant={variant}
            size={size}
            className={cn("min-w-24", className)}
          >
            {isExecuting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Attempt {attempt}...
              </>
            ) : (
              children
            )}
          </Button>
          
          {lastError && attempt > 0 && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>Attempt {attempt} failed</span>
              {attempt < maxAttempts && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retry}
                  className="ml-auto h-6 px-2 text-xs"
                >
                  Retry
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </RetryMechanism>
  );
}

// Auto-retry hook for background operations
export function useAutoRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const executeWithRetry = useCallback(async (): Promise<T | null> => {
    const finalConfig = { ...defaultConfig, ...config };
    setIsRetrying(true);
    setLastError(null);
    setAttempt(0);

    for (let currentAttempt = 0; currentAttempt < finalConfig.maxAttempts; currentAttempt++) {
      setAttempt(currentAttempt + 1);
      
      try {
        const result = await operation();
        setIsRetrying(false);
        setLastError(null);
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        setLastError(errorObj);
        
        if (currentAttempt === finalConfig.maxAttempts - 1) {
          setIsRetrying(false);
          return null;
        } else {
          const delay = finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, currentAttempt);
          await new Promise(resolve => setTimeout(resolve, Math.min(delay, finalConfig.maxDelay)));
        }
      }
    }
    
    return null;
  }, [operation, config]);

  return {
    executeWithRetry,
    isRetrying,
    attempt,
    lastError
  };
}
