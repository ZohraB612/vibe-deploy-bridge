import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { useAWS } from "./AWSContext";
import type { Project as DatabaseProject, ProjectInsert, ProjectUpdate } from "@/lib/database.types";

// Extended Project interface that matches our UI needs
export interface Project {
  id: string;
  name: string;
  domain: string;
  status: "deployed" | "deploying" | "failed" | "building" | "stopped";
  lastDeployed: Date | null;
  deployments: number;
  framework: string;
  branch: string;
  buildTime?: string | null;
  size?: string | null;
  description?: string | null;
  awsBucket?: string | null;
  awsRegion?: string | null;
  awsDistributionId?: string | null;
}

interface ProjectContextType {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'deployments' | 'lastDeployed'>) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  getProject: (id: string) => Project | undefined;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
}

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { credentials, connection } = useAWS();

  // Helper function to transform database project to UI project
  const transformProject = (dbProject: DatabaseProject): Project => ({
    id: dbProject.id,
    name: dbProject.name,
    domain: dbProject.domain,
    status: dbProject.status,
    lastDeployed: dbProject.last_deployed_at ? new Date(dbProject.last_deployed_at) : null,
    deployments: dbProject.deployment_count,
    framework: dbProject.framework,
    branch: dbProject.branch,
    buildTime: dbProject.build_time,
    size: dbProject.size,
    description: dbProject.description,
    awsBucket: dbProject.aws_bucket,
    awsRegion: dbProject.aws_region,
    awsDistributionId: dbProject.aws_distribution_id,
  });

  // Load projects when user is authenticated
  useEffect(() => {
    // ProjectContext useEffect - only runs when user ID changes
    const loadProjects = async () => {
      if (!isAuthenticated || !user) {
        setProjects([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        const transformedProjects = data.map(transformProject);
        setProjects(transformedProjects);
      } catch (err) {
        // Don't set error state for Supabase connection issues - just log and continue
        console.warn("Supabase connection issue, continuing without projects:", err);
        setError(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [isAuthenticated, user?.id]); // Only depend on user ID, not the entire user object

  const refreshProjects = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.warn("Supabase connection issue during refresh:", fetchError);
        return; // Don't throw, just return silently
      }

      const transformedProjects = data.map(transformProject);
      setProjects(transformedProjects);
    } catch (err) {
      console.warn("Supabase connection issue during refresh:", err);
      setError(null);
    }
  }, [isAuthenticated, user?.id]); // Only depend on user ID, not the entire user object

  const addProject = useCallback(async (projectData: Omit<Project, 'id' | 'deployments' | 'lastDeployed'>): Promise<Project | null> => {
    if (!isAuthenticated || !user) {
      setError("You must be authenticated to create projects");
      return null;
    }

    try {
      setError(null);
      
      const projectInsert: ProjectInsert = {
        user_id: user.id,
        name: projectData.name,
        domain: projectData.domain,
        status: projectData.status,
        framework: projectData.framework,
        branch: projectData.branch || 'main',
        build_time: projectData.buildTime,
        size: projectData.size,
        description: projectData.description,
        aws_bucket: projectData.awsBucket,
        aws_region: projectData.awsRegion,
        deployment_count: 1,
        last_deployed_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('projects')
        .insert(projectInsert)
        .select()
        .single();

      if (insertError) {
        console.warn("Supabase connection issue during project creation:", insertError);
        // Return a mock project for offline mode
        const mockProject = transformProject({
          id: crypto.randomUUID(),
          ...projectInsert,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        setProjects(prev => [mockProject, ...prev]);
        return mockProject;
      }

      const newProject = transformProject(data);
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      console.warn("Supabase connection issue during project creation:", err);
      setError(null);
      return null;
    }
  }, [isAuthenticated, user?.id]); // Only depend on user ID, not the entire user object

  const updateProject = useCallback(async (id: string, updates: Partial<Project>): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      setError("You must be authenticated to update projects");
      return false;
    }

    try {
      setError(null);

      // Transform UI updates to database format
      const projectUpdate: ProjectUpdate = {};
      if (updates.name !== undefined) projectUpdate.name = updates.name;
      if (updates.domain !== undefined) projectUpdate.domain = updates.domain;
      if (updates.status !== undefined) projectUpdate.status = updates.status;
      if (updates.framework !== undefined) projectUpdate.framework = updates.framework;
      if (updates.branch !== undefined) projectUpdate.branch = updates.branch;
      if (updates.buildTime !== undefined) projectUpdate.build_time = updates.buildTime;
      if (updates.size !== undefined) projectUpdate.size = updates.size;
      if (updates.description !== undefined) projectUpdate.description = updates.description;
      if (updates.awsBucket !== undefined) projectUpdate.aws_bucket = updates.awsBucket;
      if (updates.awsRegion !== undefined) projectUpdate.aws_region = updates.awsRegion;
      if (updates.awsDistributionId !== undefined) projectUpdate.aws_distribution_id = updates.awsDistributionId;
      if (updates.deployments !== undefined) projectUpdate.deployment_count = updates.deployments;
      if (updates.lastDeployed !== undefined) projectUpdate.last_deployed_at = updates.lastDeployed?.toISOString();

      const { data, error: updateError } = await supabase
        .from('projects')
        .update(projectUpdate)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.warn("Supabase connection issue during project update:", updateError);
        // Update local state for offline mode
        setProjects(prev => prev.map(project => 
          project.id === id ? { ...project, ...updates } : project
        ));
        return true;
      }

      const updatedProject = transformProject(data);
      setProjects(prev => prev.map(project => 
        project.id === id ? updatedProject : project
      ));
      return true;
    } catch (err) {
      console.warn("Supabase connection issue during project update:", err);
      setError(null);
      return false;
    }
  }, [isAuthenticated, user?.id]); // Only depend on user ID, not the entire user object

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    console.log('deleteProject called with ID:', id);
    console.log('Current user:', user);
    console.log('Is authenticated:', isAuthenticated);
    console.log('Available credentials:', credentials);
    
    if (!isAuthenticated || !user) {
      console.error('Authentication check failed');
      setError("You must be authenticated to delete projects");
      return false;
    }

    try {
      setError(null);
      console.log('Starting project deletion process...');

      // Get project details before deletion for AWS cleanup
      const projectToDelete = projects.find(p => p.id === id);
      console.log('Project to delete:', projectToDelete);
      
      if (!projectToDelete) {
        console.error('Project not found in projects array');
        setError("Project not found");
        return false;
      }

      // Clean up AWS resources if project has AWS resources
      if (projectToDelete.awsBucket || projectToDelete.awsDistributionId) {
        if (!credentials) {
          console.warn('AWS credentials not available, skipping AWS cleanup');
          // Continue with project deletion from database
        } else {
        try {
          console.log(`Cleaning up AWS resources for project: ${projectToDelete.name}`);
          
          // Call backend cleanup endpoint
          const response = await fetch('http://localhost:3001/cleanup-project', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectName: projectToDelete.name,
              bucketName: projectToDelete.awsBucket,
              distributionId: projectToDelete.awsDistributionId,
              credentials: {
                accessKeyId: credentials?.accessKeyId || '',
                secretAccessKey: credentials?.secretAccessKey || '',
                sessionToken: credentials?.sessionToken || '',
              },
              region: projectToDelete.awsRegion || 'us-east-1'
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log('AWS cleanup result:', result);
          } else {
            console.warn('AWS cleanup failed, but continuing with project deletion');
          }
        } catch (awsError) {
          console.warn('AWS cleanup failed, but continuing with project deletion:', awsError);
        }
        }
      }

      // Delete project from database
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.warn("Supabase connection issue during project deletion:", deleteError);
        // Remove from local state for offline mode
        setProjects(prev => prev.filter(project => project.id !== id));
        return true;
      }

      setProjects(prev => prev.filter(project => project.id !== id));
      return true;
    } catch (err) {
      console.warn("Supabase connection issue during project deletion:", err);
      setError(null);
      return false;
    }
  }, [isAuthenticated, user, projects, credentials]);

  const getProject = useCallback((id: string) => {
    return projects.find(project => project.id === id);
  }, [projects]);

  const value: ProjectContextType = useMemo(() => ({
    projects,
    isLoading,
    error,
    refreshProjects,
    addProject,
    updateProject,
    deleteProject,
    getProject,
  }), [projects, isLoading, error, refreshProjects, addProject, updateProject, deleteProject, getProject]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}
