import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import type { ProjectEnvironmentVariableInsert, ProjectEnvironmentVariableUpdate } from "@/lib/database.types";
import type { ProjectEnvironmentVariable } from "@/lib/database.types";

export interface EnvironmentVariable {
  id: string;
  projectId: string;
  keyName: string;
  value: string;
  environment: 'development' | 'staging' | 'production';
  isSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentTemplate {
  id: string;
  name: string;
  description: string;
  variables: {
    key: string;
    description: string;
    defaultValue?: string;
    isSecret: boolean;
    required: boolean;
  }[];
}

export interface EnvironmentContextType {
  // Environment Variables
  variables: EnvironmentVariable[];
  isLoading: boolean;
  error: string | null;
  
  // Environment Management
  currentEnvironment: 'development' | 'staging' | 'production';
  setCurrentEnvironment: (env: 'development' | 'staging' | 'production') => void;
  
  // Templates
  templates: EnvironmentTemplate[];
  isLoadingTemplates: boolean;
  
  // Methods
  fetchVariables: (projectId: string, environment?: 'development' | 'staging' | 'production') => Promise<void>;
  addVariable: (projectId: string, keyName: string, value: string, environment: 'development' | 'staging' | 'production', isSecret: boolean) => Promise<EnvironmentVariable | null>;
  updateVariable: (id: string, updates: Partial<EnvironmentVariable>) => Promise<boolean>;
  deleteVariable: (id: string) => Promise<boolean>;
  copyVariables: (fromEnv: 'development' | 'staging' | 'production', toEnv: 'development' | 'staging' | 'production', projectId: string) => Promise<boolean>;
  
  // Bulk Operations
  importVariables: (projectId: string, variables: { key: string; value: string; isSecret: boolean }[], environment: 'development' | 'staging' | 'production') => Promise<number>;
  exportVariables: (projectId: string, environment: 'development' | 'staging' | 'production', format: 'env' | 'json' | 'yaml') => string;
  
  // Templates
  fetchTemplates: () => Promise<void>;
  applyTemplate: (projectId: string, templateId: string, environment: 'development' | 'staging' | 'production') => Promise<boolean>;
  
  // Validation & Utilities
  validateVariables: (projectId: string, environment: 'development' | 'staging' | 'production') => Promise<{ valid: boolean; errors: string[] }>;
  searchVariables: (query: string) => EnvironmentVariable[];
  getVariablesByPrefix: (prefix: string) => EnvironmentVariable[];
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error("useEnvironment must be used within an EnvironmentProvider");
  }
  return context;
}

interface EnvironmentProviderProps {
  children: ReactNode;
}

export function EnvironmentProvider({ children }: EnvironmentProviderProps) {
  const { user, isAuthenticated } = useAuth();
  
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEnvironment, setCurrentEnvironment] = useState<'development' | 'staging' | 'production'>('development');
  
  const [templates, setTemplates] = useState<EnvironmentTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Initialize templates with common ones
  useEffect(() => {
    const commonTemplates: EnvironmentTemplate[] = [
      {
        id: 'react-app',
        name: 'React Application',
        description: 'Common environment variables for React applications',
        variables: [
          { key: 'REACT_APP_API_URL', description: 'API endpoint URL', defaultValue: 'https://api.example.com', isSecret: false, required: true },
          { key: 'REACT_APP_ENV', description: 'Environment name', defaultValue: 'development', isSecret: false, required: true },
          { key: 'REACT_APP_SENTRY_DSN', description: 'Sentry error tracking DSN', isSecret: true, required: false },
          { key: 'REACT_APP_GOOGLE_ANALYTICS_ID', description: 'Google Analytics tracking ID', isSecret: false, required: false },
        ]
      },
      {
        id: 'next-app',
        name: 'Next.js Application',
        description: 'Environment variables for Next.js applications',
        variables: [
          { key: 'NEXTAUTH_URL', description: 'NextAuth.js URL', defaultValue: 'http://localhost:3000', isSecret: false, required: true },
          { key: 'NEXTAUTH_SECRET', description: 'NextAuth.js secret', isSecret: true, required: true },
          { key: 'DATABASE_URL', description: 'Database connection string', isSecret: true, required: true },
          { key: 'NEXT_PUBLIC_APP_URL', description: 'Public application URL', isSecret: false, required: true },
        ]
      },
      {
        id: 'node-api',
        name: 'Node.js API',
        description: 'Common environment variables for Node.js APIs',
        variables: [
          { key: 'PORT', description: 'Server port', defaultValue: '3000', isSecret: false, required: true },
          { key: 'NODE_ENV', description: 'Node environment', defaultValue: 'development', isSecret: false, required: true },
          { key: 'JWT_SECRET', description: 'JWT signing secret', isSecret: true, required: true },
          { key: 'DATABASE_URL', description: 'Database connection URL', isSecret: true, required: true },
          { key: 'REDIS_URL', description: 'Redis connection URL', isSecret: true, required: false },
        ]
      }
    ];
    setTemplates(commonTemplates);
  }, []);

  const transformVariable = (dbVar: ProjectEnvironmentVariable): EnvironmentVariable => ({
    id: dbVar.id,
    projectId: dbVar.project_id,
    keyName: dbVar.key_name,
    value: dbVar.value_encrypted, // In a real app, this would be decrypted
    environment: dbVar.environment,
    isSecret: dbVar.is_secret,
    createdAt: new Date(dbVar.created_at),
    updatedAt: new Date(dbVar.updated_at)
  });

  const fetchVariables = useCallback(async (
    projectId: string, 
    environment?: 'development' | 'staging' | 'production'
  ) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('project_environment_variables')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id);

      if (environment) {
        query = query.eq('environment', environment);
      }

      const { data, error: fetchError } = await query.order('key_name', { ascending: true });

      if (fetchError) throw fetchError;

      const transformedVariables = data.map(transformVariable);
      setVariables(transformedVariables);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch environment variables";
      setError(errorMessage);
      console.error("Failed to fetch environment variables:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addVariable = useCallback(async (
    projectId: string,
    keyName: string,
    value: string,
    environment: 'development' | 'staging' | 'production',
    isSecret: boolean
  ): Promise<EnvironmentVariable | null> => {
    if (!user) return null;

    try {
      setError(null);
      
      // In a real app, we would encrypt the value before storing
      const encryptedValue = isSecret ? btoa(value) : value; // Simple base64 for demo
      
      const variableInsert: ProjectEnvironmentVariableInsert = {
        project_id: projectId,
        user_id: user.id,
        key_name: keyName,
        value_encrypted: encryptedValue,
        environment,
        is_secret: isSecret
      };

      const { data, error: insertError } = await supabase
        .from('project_environment_variables')
        .insert(variableInsert)
        .select()
        .single();

      if (insertError) throw insertError;

      const newVariable = transformVariable(data);
      setVariables(prev => [...prev, newVariable]);
      return newVariable;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add environment variable";
      setError(errorMessage);
      console.error("Failed to add environment variable:", err);
      return null;
    }
  }, [user]);

  const updateVariable = useCallback(async (
    id: string,
    updates: Partial<EnvironmentVariable>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      const variableUpdate: ProjectEnvironmentVariableUpdate = {};
      if (updates.keyName) variableUpdate.key_name = updates.keyName;
      if (updates.value) {
        // Encrypt if secret
        const variable = variables.find(v => v.id === id);
        const isSecret = updates.isSecret ?? variable?.isSecret ?? false;
        variableUpdate.value_encrypted = isSecret ? btoa(updates.value) : updates.value;
      }
      if (updates.environment) variableUpdate.environment = updates.environment;
      if (updates.isSecret !== undefined) variableUpdate.is_secret = updates.isSecret;

      const { data, error: updateError } = await supabase
        .from('project_environment_variables')
        .update(variableUpdate)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      const updatedVariable = transformVariable(data);
      setVariables(prev => prev.map(variable => 
        variable.id === id ? updatedVariable : variable
      ));
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update environment variable";
      setError(errorMessage);
      console.error("Failed to update environment variable:", err);
      return false;
    }
  }, [user, variables]);

  const deleteVariable = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('project_environment_variables')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setVariables(prev => prev.filter(variable => variable.id !== id));
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete environment variable";
      setError(errorMessage);
      console.error("Failed to delete environment variable:", err);
      return false;
    }
  }, [user]);

  const copyVariables = useCallback(async (
    fromEnv: 'development' | 'staging' | 'production',
    toEnv: 'development' | 'staging' | 'production',
    projectId: string
  ): Promise<boolean> => {
    if (!user || fromEnv === toEnv) return false;

    try {
      setError(null);

      // Get variables from source environment
      const { data: sourceVars, error: fetchError } = await supabase
        .from('project_environment_variables')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('environment', fromEnv);

      if (fetchError) throw fetchError;

      // Create new variables for target environment
      const newVariables = sourceVars.map(variable => ({
        project_id: projectId,
        user_id: user.id,
        key_name: variable.key_name,
        value_encrypted: variable.value_encrypted,
        environment: toEnv,
        is_secret: variable.is_secret
      }));

      const { error: insertError } = await supabase
        .from('project_environment_variables')
        .insert(newVariables);

      if (insertError) throw insertError;

      // Refresh variables if we're viewing the target environment
      if (currentEnvironment === toEnv) {
        await fetchVariables(projectId, toEnv);
      }

      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to copy environment variables";
      setError(errorMessage);
      console.error("Failed to copy environment variables:", err);
      return false;
    }
  }, [user, currentEnvironment, fetchVariables]);

  const importVariables = useCallback(async (
    projectId: string,
    variables: { key: string; value: string; isSecret: boolean }[],
    environment: 'development' | 'staging' | 'production'
  ): Promise<number> => {
    if (!user) return 0;

    try {
      setError(null);

      const newVariables = variables.map(variable => ({
        project_id: projectId,
        user_id: user.id,
        key_name: variable.key,
        value_encrypted: variable.isSecret ? btoa(variable.value) : variable.value,
        environment,
        is_secret: variable.isSecret
      }));

      const { data, error: insertError } = await supabase
        .from('project_environment_variables')
        .insert(newVariables)
        .select();

      if (insertError) throw insertError;

      // Refresh variables
      await fetchVariables(projectId, environment);

      return data.length;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import environment variables";
      setError(errorMessage);
      console.error("Failed to import environment variables:", err);
      return 0;
    }
  }, [user, fetchVariables]);

  const exportVariables = useCallback((
    projectId: string,
    environment: 'development' | 'staging' | 'production',
    format: 'env' | 'json' | 'yaml'
  ): string => {
    const envVars = variables.filter(v => 
      v.projectId === projectId && v.environment === environment
    );

    switch (format) {
      case 'env':
        return envVars.map(v => 
          `${v.keyName}=${v.isSecret ? '[REDACTED]' : v.value}`
        ).join('\n');
      
      case 'json': {
        const jsonObj = envVars.reduce((acc, v) => ({
          ...acc,
          [v.keyName]: v.isSecret ? '[REDACTED]' : v.value
        }), {});
        return JSON.stringify(jsonObj, null, 2);
      }
      
      case 'yaml':
        return envVars.map(v => 
          `${v.keyName}: ${v.isSecret ? '[REDACTED]' : v.value}`
        ).join('\n');
      
      default:
        return '';
    }
  }, [variables]);

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    // Templates are static for now, but could be fetched from database
    setIsLoadingTemplates(false);
  }, []);

  const applyTemplate = useCallback(async (
    projectId: string,
    templateId: string,
    environment: 'development' | 'staging' | 'production'
  ): Promise<boolean> => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return false;

    const templateVariables = template.variables.map(v => ({
      key: v.key,
      value: v.defaultValue || '',
      isSecret: v.isSecret
    }));

    const imported = await importVariables(projectId, templateVariables, environment);
    return imported > 0;
  }, [templates, importVariables]);

  const validateVariables = useCallback(async (
    projectId: string,
    environment: 'development' | 'staging' | 'production'
  ): Promise<{ valid: boolean; errors: string[] }> => {
    const errors: string[] = [];
    const envVars = variables.filter(v => 
      v.projectId === projectId && v.environment === environment
    );

    // Check for empty values in required variables
    const emptyVars = envVars.filter(v => !v.value.trim());
    if (emptyVars.length > 0) {
      errors.push(`Empty values found: ${emptyVars.map(v => v.keyName).join(', ')}`);
    }

    // Check for duplicate keys
    const keys = envVars.map(v => v.keyName);
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate keys found: ${[...new Set(duplicates)].join(', ')}`);
    }

    // Check for common naming conventions
    const invalidNames = envVars.filter(v => 
      !/^[A-Z][A-Z0-9_]*$/.test(v.keyName)
    );
    if (invalidNames.length > 0) {
      errors.push(`Invalid naming convention: ${invalidNames.map(v => v.keyName).join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, [variables]);

  const searchVariables = useCallback((query: string): EnvironmentVariable[] => {
    if (!query) return variables;
    
    const lowercaseQuery = query.toLowerCase();
    return variables.filter(v => 
      v.keyName.toLowerCase().includes(lowercaseQuery) ||
      v.value.toLowerCase().includes(lowercaseQuery)
    );
  }, [variables]);

  const getVariablesByPrefix = useCallback((prefix: string): EnvironmentVariable[] => {
    return variables.filter(v => v.keyName.startsWith(prefix));
  }, [variables]);

  const value: EnvironmentContextType = {
    variables,
    isLoading,
    error,
    currentEnvironment,
    setCurrentEnvironment,
    templates,
    isLoadingTemplates,
    fetchVariables,
    addVariable,
    updateVariable,
    deleteVariable,
    copyVariables,
    importVariables,
    exportVariables,
    fetchTemplates,
    applyTemplate,
    validateVariables,
    searchVariables,
    getVariablesByPrefix,
  };

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
}
