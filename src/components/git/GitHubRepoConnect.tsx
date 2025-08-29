import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Github, Globe, CheckCircle, Search, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
  private: boolean;
  description?: string;
  language?: string;
  updated_at: string;
}

interface GitHubRepoConnectProps {
  onRepoSelect: (repo: GitHubRepo) => void;
  onCancel?: () => void;
}

export function GitHubRepoConnect({ onRepoSelect, onCancel }: GitHubRepoConnectProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasGitHubAccess, setHasGitHubAccess] = useState(false);
  const [isConnectingGitHub, setIsConnectingGitHub] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user has GitHub access on mount and when returning from OAuth
  useEffect(() => {
    const checkGitHubAccess = async () => {
      if (!user) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const hasAccess = !!(session?.provider_token || session?.provider_refresh_token);
        setHasGitHubAccess(hasAccess);
        
        // If we just returned from GitHub OAuth, show success message
        if (hasAccess && sessionStorage.getItem('github_oauth_return_url')) {
          toast({
            title: "GitHub Connected!",
            description: "You can now load your repositories",
          });
          // Clear the flag
          sessionStorage.removeItem('github_oauth_return_url');
        }
      } catch (error) {
        console.error('Failed to check GitHub access:', error);
        setHasGitHubAccess(false);
      }
    };

    checkGitHubAccess();
    
    // Also check when the component becomes visible (e.g., after OAuth return)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkGitHubAccess();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, toast]);

  const fetchRepositories = async () => {
    if (!user) {
      setError("You must be logged in to access GitHub repositories");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Check if user has GitHub OAuth connected
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if user has GitHub OAuth connected
      if (!session?.provider_token) {
        setError("GitHub access required. Please connect your GitHub account using the button above.");
        return;
      }

      const githubToken = session?.provider_token;
      
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError("GitHub access expired. Please sign in with GitHub again.");
        } else {
          setError(`Failed to fetch repositories: ${response.statusText}`);
        }
        return;
      }
      
      const repos = await response.json();
      setRepos(repos);
      
      if (repos.length === 0) {
        setError("No repositories found. Make sure you have access to some repositories on GitHub.");
      }
      
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      setError("Failed to connect to GitHub. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const connectGitHub = async () => {
    setIsConnectingGitHub(true);
    setError(null);
    
    try {
      // Store current location to return after OAuth
      const returnUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem('github_oauth_return_url', returnUrl);
      
      // Use Supabase OAuth to connect GitHub
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?provider=github&return_to=${encodeURIComponent(returnUrl)}`,
          scopes: 'repo', // Only request repository access
        }
      });
      
      if (error) {
        throw error;
      }
      
      // The user will be redirected to GitHub for authorization
      // After authorization, they'll return to the callback page
      toast({
        title: "Connecting to GitHub",
        description: "You'll be redirected to GitHub to authorize access",
      });
      
    } catch (error: any) {
      setError(`Failed to connect GitHub: ${error.message}`);
      toast({
        title: "GitHub Connection Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsConnectingGitHub(false);
    }
  };

  const disconnectGitHub = async () => {
    try {
      // Clear any stored GitHub tokens
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.provider_token) {
        // Note: Supabase doesn't provide a direct way to revoke OAuth tokens
        // The user would need to revoke access from their GitHub account
        // For now, we'll just update the local state
        setHasGitHubAccess(false);
        setRepos([]);
        
        toast({
          title: "GitHub Disconnected",
          description: "To fully revoke access, please go to GitHub Settings → Applications → DeployHub → Revoke",
        });
      }
    } catch (error: any) {
      console.error('Failed to disconnect GitHub:', error);
      toast({
        title: "Disconnect Failed",
        description: "Please try again or revoke access from GitHub directly",
        variant: "destructive"
      });
    }
  };

  const handleRepoSelect = (repo: GitHubRepo) => {
    onRepoSelect(repo);
    toast({
      title: "Repository Selected",
      description: `${repo.name} will be used for deployment`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Connect GitHub Repository
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select a repository to deploy from GitHub
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!user && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm">
              Please sign in to access your repositories.
            </p>
          </div>
        )}

        {user && (
          <>
            {/* GitHub OAuth Connection Section */}
            <div className={`p-4 border rounded-lg mb-4 ${
              hasGitHubAccess 
                ? 'bg-green-50 border-green-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-medium mb-1 ${
                    hasGitHubAccess ? 'text-green-900' : 'text-blue-900'
                  }`}>
                    {hasGitHubAccess ? 'GitHub Connected ✓' : 'Connect GitHub Account'}
                  </h4>
                  <p className={`text-sm ${
                    hasGitHubAccess ? 'text-green-700' : 'text-blue-700'
                  }`}>
                    {hasGitHubAccess 
                      ? 'Your GitHub account is connected and ready for deployment'
                      : 'Connect your GitHub account to deploy from repositories'
                    }
                  </p>
                </div>
                {!hasGitHubAccess ? (
                  <Button 
                    onClick={connectGitHub}
                    variant="outline"
                    size="sm"
                    disabled={isConnectingGitHub}
                    className="bg-white hover:bg-blue-50"
                  >
                    {isConnectingGitHub ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Github className="h-4 w-4 mr-2" />
                        Connect GitHub
                      </>
                      )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                    <Button 
                      onClick={disconnectGitHub}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Disconnect
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={fetchRepositories} 
                disabled={isLoading || !hasGitHubAccess}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4 mr-2" />
                    Load My Repositories
                  </>
                )}
              </Button>
              
              {!hasGitHubAccess && (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                  <p>⚠️ Connect your GitHub account above to access repositories</p>
                </div>
              )}
              
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-medium mb-2">⚠️ {error}</p>
                {error.includes('GitHub access required') && (
                  <p className="text-red-700 text-sm mb-2">
                    Click the "Connect GitHub" button above to authorize repository access.
                  </p>
                )}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-red-800 text-sm underline"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </Button>
              </div>
            )}
            
            {isLoading && (
              <div className="p-4 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading your repositories...</p>
              </div>
            )}
            
            {repos.length > 0 && !isLoading && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="repo-search">Search Repositories</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="repo-search"
                      placeholder="Search by name or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredRepos.length} of {repos.length} repositories
                  </p>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {filteredRepos.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <p className="text-sm">No repositories found matching your search.</p>
                      <p className="text-xs">Try adjusting your search terms or check if you have access to repositories.</p>
                    </div>
                  ) : (
                    filteredRepos.map(repo => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleRepoSelect(repo)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Github className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium truncate">{repo.name}</span>
                          {repo.private && (
                            <Badge variant="secondary" className="text-xs">Private</Badge>
                          )}
                        </div>
                        
                        {repo.description && (
                          <p className="text-sm text-muted-foreground truncate mb-1">
                            {repo.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Branch: {repo.default_branch}</span>
                          {repo.language && <span>• {repo.language}</span>}
                          <span>• Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <CheckCircle className="h-4 w-4 text-muted-foreground ml-2" />
                    </div>
                  ))
                  )}
                </div>
                
                {filteredRepos.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No repositories match "{searchQuery}"</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
