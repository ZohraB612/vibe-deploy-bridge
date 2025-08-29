import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ConnectedRepository, ConnectedRepositoryInsert } from "@/lib/database.types";

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

// Use the database type instead of local interface

interface GitHubContextType {
  connectedRepos: ConnectedRepository[];
  isLoading: boolean;
  error: string | null;
  
  // Repository management
  addConnectedRepo: (repo: GitHubRepo) => Promise<boolean>;
  removeConnectedRepo: (repoId: string) => Promise<boolean>;
  refreshConnectedRepos: () => Promise<void>;
  
  // GitHub API operations
  getRepoBranches: (repoFullName: string) => Promise<string[]>;
  getRepoCommits: (repoFullName: string, branch: string) => Promise<any[]>;
  getRepoContent: (repoFullName: string, path: string, branch?: string) => Promise<any>;
  
  // Utility methods
  isRepoConnected: (repoId: number) => boolean;
  getConnectedRepo: (repoId: number) => ConnectedRepository | undefined;
}

const GitHubContext = createContext<GitHubContextType | undefined>(undefined);

export function useGitHub() {
  const context = useContext(GitHubContext);
  if (!context) {
    throw new Error('useGitHub must be used within GitHubProvider');
  }
  return context;
}

interface GitHubProviderProps {
  children: ReactNode;
}

export function GitHubProvider({ children }: GitHubProviderProps) {
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Load connected repositories on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadConnectedRepos();
    } else {
      setConnectedRepos([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadConnectedRepos = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('connected_repositories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setConnectedRepos(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load connected repositories";
      setError(errorMessage);
      console.error("Failed to load connected repositories:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addConnectedRepo = useCallback(async (repo: GitHubRepo): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to connect repositories",
        variant: "destructive"
      });
      return false;
    }

    try {
      setError(null);

      // Check if repository is already connected
      const existingRepo = connectedRepos.find(r => r.github_repo_id === repo.id);
      if (existingRepo) {
        toast({
          title: "Repository Already Connected",
          description: `${repo.name} is already connected to your account`,
        });
        return true;
      }

      // Insert new connected repository
      const repoInsert: ConnectedRepositoryInsert = {
        user_id: user.id,
        github_repo_id: repo.id,
        repo_name: repo.name,
        repo_full_name: repo.full_name,
        default_branch: repo.default_branch,
        is_private: repo.private
      };

      const { data, error: insertError } = await supabase
        .from('connected_repositories')
        .insert(repoInsert)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Add to local state
      setConnectedRepos(prev => [data, ...prev]);

      toast({
        title: "Repository Connected",
        description: `${repo.name} is now connected and ready for deployment`,
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect repository";
      setError(errorMessage);
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
      console.error("Failed to connect repository:", err);
      return false;
    }
  }, [user, connectedRepos, toast]);

  const removeConnectedRepo = useCallback(async (repoId: string): Promise<boolean> => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('connected_repositories')
        .delete()
        .eq('id', repoId);

      if (deleteError) {
        throw deleteError;
      }

      // Remove from local state
      setConnectedRepos(prev => prev.filter(repo => repo.id !== repoId));

      toast({
        title: "Repository Disconnected",
        description: "Repository has been removed from your account",
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to disconnect repository";
      setError(errorMessage);
      toast({
        title: "Disconnection Failed",
        description: errorMessage,
        variant: "destructive"
      });
      console.error("Failed to disconnect repository:", err);
      return false;
    }
  }, [toast]);

  const refreshConnectedRepos = useCallback(async () => {
    await loadConnectedRepos();
  }, [loadConnectedRepos]);

  const getRepoBranches = useCallback(async (repoFullName: string): Promise<string[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const githubToken = session?.provider_token || session?.access_token;

      if (!githubToken) {
        throw new Error("GitHub access token not found");
      }

      const response = await fetch(`https://api.github.com/repos/${repoFullName}/branches`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.statusText}`);
      }

      const branches = await response.json();
      return branches.map((branch: any) => branch.name);
    } catch (error) {
      console.error('Failed to fetch repository branches:', error);
      return [];
    }
  }, []);

  const getRepoCommits = useCallback(async (repoFullName: string, branch: string): Promise<any[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const githubToken = session?.provider_token || session?.access_token;

      if (!githubToken) {
        throw new Error("GitHub access token not found");
      }

      const response = await fetch(`https://api.github.com/repos/${repoFullName}/commits?sha=${branch}&per_page=10`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch commits: ${response.statusText}`);
      }

      const commits = await response.json();
      return commits.map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        url: commit.html_url
      }));
    } catch (error) {
      console.error('Failed to fetch repository commits:', error);
      return [];
    }
  }, []);

  const getRepoContent = useCallback(async (repoFullName: string, path: string, branch?: string): Promise<any> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const githubToken = session?.provider_token || session?.access_token;

      if (!githubToken) {
        throw new Error("GitHub access token not found");
      }

      const url = branch 
        ? `https://api.github.com/repos/${repoFullName}/contents/${path}?ref=${branch}`
        : `https://api.github.com/repos/${repoFullName}/contents/${path}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch repository content:', error);
      return null;
    }
  }, []);

  const isRepoConnected = useCallback((repoId: number): boolean => {
    return connectedRepos.some(repo => repo.github_repo_id === repoId);
  }, [connectedRepos]);

  const getConnectedRepo = useCallback((repoId: number): ConnectedRepo | undefined => {
    return connectedRepos.find(repo => repo.github_repo_id === repoId);
  }, [connectedRepos]);

  const value: GitHubContextType = {
    connectedRepos,
    isLoading,
    error,
    addConnectedRepo,
    removeConnectedRepo,
    refreshConnectedRepos,
    getRepoBranches,
    getRepoCommits,
    getRepoContent,
    isRepoConnected,
    getConnectedRepo,
  };

  return (
    <GitHubContext.Provider value={value}>
      {children}
    </GitHubContext.Provider>
  );
}
