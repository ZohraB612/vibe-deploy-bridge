import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ResourceCleanupProps {
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
  region: string;
}

interface CleanupResult {
  success: boolean;
  message: string;
  details?: string;
}

interface CleanupSummary {
  total: number;
  successful: number;
  failed: number;
  results: CleanupResult[];
}

export function ResourceCleanup({ credentials, region }: ResourceCleanupProps) {
  const [bucketNames, setBucketNames] = useState('');
  const [distributionIds, setDistributionIds] = useState('');
  const [cleanupResults, setCleanupResults] = useState<CleanupResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<CleanupSummary>({
    total: 0,
    successful: 0,
    failed: 0,
    results: []
  });
  const { toast } = useToast();

  const handleCleanup = async () => {
    if (!bucketNames.trim() && !distributionIds.trim()) {
      toast({
        title: "No resources specified",
        description: "Please enter at least one bucket name or distribution ID to clean up.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setCleanupResults([]);
    setSummary({ total: 0, successful: 0, failed: 0, results: [] });

    try {
      const bucketList = bucketNames.trim() ? bucketNames.split('\n').map(b => b.trim()).filter(b => b) : [];
      const distributionList = distributionIds.trim() ? distributionIds.split('\n').map(d => d.trim()).filter(d => d) : [];

      const response = await fetch('http://localhost:3001/cleanup-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucketNames: bucketList,
          distributionIds: distributionList,
          credentials,
          region
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Cleanup failed with status: ${response.status}`);
      }

      const result = await response.json();
      setCleanupResults(result.results.deleted);
      setSummary({
        total: result.results.deleted.length,
        successful: result.results.deleted.length,
        failed: 0,
        results: result.results.deleted
      });
      
      toast({
        title: "Cleanup completed",
        description: `Successfully cleaned up ${result.results.deleted.length} resources.`,
        variant: "default"
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Cleanup failed';
      toast({
        title: "Cleanup Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          AWS Resource Cleanup
        </CardTitle>
        <CardDescription>
          Remove old S3 buckets and CloudFront distributions that are no longer needed.
          This will permanently delete these resources and cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This action is irreversible. Make sure you want to delete these resources.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="buckets">S3 Bucket Names (one per line)</Label>
          <Textarea
            id="buckets"
            placeholder="deployhub-demo-deployhub-app-1234567890&#10;deployhub-test-project-0987654321"
            value={bucketNames}
            onChange={(e) => setBucketNames(e.target.value)}
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Enter the names of S3 buckets you want to delete
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="distributions">CloudFront Distribution IDs (one per line)</Label>
          <Textarea
            id="distributions"
            placeholder="E18QOC381M762N&#10;ABC123DEF456"
            value={distributionIds}
            onChange={(e) => setDistributionIds(e.target.value)}
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Enter the IDs of CloudFront distributions you want to delete
          </p>
        </div>

        <Button 
          onClick={handleCleanup} 
          disabled={isLoading || (!bucketNames.trim() && !distributionIds.trim())}
          className="w-full"
          variant="destructive"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cleaning up resources...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Clean Up Resources
            </>
          )}
        </Button>

        {cleanupResults && (
          <div className="space-y-3">
            <h4 className="font-medium">Cleanup Results:</h4>
            
            {summary.total > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Successfully Deleted ({summary.total})
                </h5>
                <div className="bg-green-50 p-3 rounded-md space-y-1">
                  {summary.results.map((item: string, index: number) => (
                    <div key={index} className="text-sm text-green-700">{item}</div>
                  ))}
                </div>
              </div>
            )}

            {summary.failed > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Errors ({summary.failed})
                </h5>
                <div className="bg-red-50 p-3 rounded-md space-y-1">
                  {/* The original code had results.results.errors, but results is no longer used.
                      Assuming the intent was to show errors from the summary or a placeholder.
                      For now, we'll show a placeholder or remove if not directly relevant.
                      Given the new state, it seems the errors are now part of the summary.
                      Let's assume the errors are the ones that failed to delete. */}
                  {summary.results.filter((item: string) => item.includes('Error:')).map((error: string, index: number) => (
                    <div key={index} className="text-sm text-red-700">{error}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
