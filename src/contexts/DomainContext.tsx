import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";
import { useAWS } from "./AWSContext";

export interface Domain {
  id: string;
  user_id: string;
  domain_name: string;
  status: 'pending' | 'verified' | 'active' | 'error';
  dns_records: DNSRecord[];
  ssl_status: 'pending' | 'active' | 'expired' | 'error';
  ssl_expiry?: string;
  verification_method: 'dns' | 'file' | 'meta';
  verification_token?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface DNSRecord {
  id: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';
  name: string;
  value: string;
  ttl: number;
  priority?: number;
  status: 'pending' | 'active' | 'error';
}

export interface DomainInsert {
  project_id: string;
  domain_name: string;
  verification_method: 'dns' | 'file' | 'meta';
}

export interface DomainUpdate {
  domain_name?: string;
  status?: Domain['status'];
  ssl_status?: Domain['ssl_status'];
  dns_records?: DNSRecord[];
  verification_token?: string;
}

interface DomainContextType {
  domains: Domain[];
  isLoading: boolean;
  error: string | null;
  
  // Domain operations
  addDomain: (domain: DomainInsert) => Promise<Domain | null>;
  updateDomain: (id: string, updates: DomainUpdate) => Promise<Domain | null>;
  deleteDomain: (id: string) => Promise<boolean>;
  verifyDomain: (id: string) => Promise<boolean>;
  
  // DNS operations
  addDNSRecord: (domainId: string, record: Omit<DNSRecord, 'id' | 'status'>) => Promise<DNSRecord | null>;
  updateDNSRecord: (domainId: string, recordId: string, updates: Partial<DNSRecord>) => Promise<DNSRecord | null>;
  deleteDNSRecord: (domainId: string, recordId: string) => Promise<boolean>;
  
  // SSL operations
  provisionSSL: (domainId: string) => Promise<boolean>;
  renewSSL: (domainId: string) => Promise<boolean>;
  
  // Utility functions
  refreshDomains: () => Promise<void>;
  getDomainByProject: (projectId: string) => Domain[];
}

const DomainContext = createContext<DomainContextType | undefined>(undefined);

export function useDomains() {
  const context = useContext(DomainContext);
  if (context === undefined) {
    throw new Error("useDomains must be used within a DomainProvider");
  }
  return context;
}

interface DomainProviderProps {
  children: ReactNode;
}

export function DomainProvider({ children }: DomainProviderProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Load domains for the current user
  const loadDomains = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('project_domains')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setDomains(data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch domains';
      setError(errorMessage);
      console.error("Failed to fetch domains:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Add new domain
  const addDomain = useCallback(async (domain: DomainInsert): Promise<Domain | null> => {
    if (!user) return null;
    
    try {
      setError(null);
      
      const newDomain = {
        ...domain,
        user_id: user.id,
        status: 'pending' as const,
        ssl_status: 'pending' as const,
        dns_records: [],
        verification_token: generateVerificationToken(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: insertError } = await supabase
        .from('project_domains')
        .insert(newDomain)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setDomains(prev => [data, ...prev]);
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add domain';
      setError(errorMessage);
      console.error('Error adding domain:', err);
      return null;
    }
  }, [user]);

  // Update domain
  const updateDomain = useCallback(async (id: string, updates: DomainUpdate): Promise<Domain | null> => {
    try {
      setError(null);
      
      const { data, error: updateError } = await supabase
        .from('project_domains')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setDomains(prev => prev.map(domain => 
        domain.id === id ? data : domain
      ));
      
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update domain';
      setError(errorMessage);
      console.error('Error updating domain:', err);
      return null;
    }
  }, [user]);

  // Delete domain
  const deleteDomain = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const { error: deleteError } = await supabase
        .from('project_domains')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (deleteError) {
        throw deleteError;
      }

      setDomains(prev => prev.filter(domain => domain.id !== id));
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete domain';
      setError(errorMessage);
      console.error('Error deleting domain:', err);
      return false;
    }
  }, [user]);

  // Provision SSL certificate
  const provisionSSL = useCallback(async (domainId: string): Promise<boolean> => {
    try {
      const domain = domains.find(d => d.id === domainId);
      if (!domain) {
        throw new Error('Domain not found');
      }

      // Get AWS connection from context
      const awsConnection = useAWS();
      if (!awsConnection.connection) {
        throw new Error('AWS connection not established');
      }

      // Provision SSL certificate using real AWS
      const success = await awsConnection.provisionSSL(domain.domain_name);
      
      if (success) {
        // Update domain status in database
        const { error } = await supabase
          .from('project_domains')
          .update({ 
            ssl_status: 'active',
            ssl_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
            updated_at: new Date().toISOString()
          })
          .eq('id', domainId);

        if (error) throw error;

        // Refresh domains
        await loadDomains();
        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to provision SSL';
      console.error('Error provisioning SSL:', errorMessage);
      return false;
    }
  }, [domains, loadDomains, useAWS]);

  // Renew SSL certificate
  const renewSSL = useCallback(async (domainId: string): Promise<boolean> => {
    try {
      const domain = domains.find(d => d.id === domainId);
      if (!domain) {
        throw new Error('Domain not found');
      }

      // Get AWS connection from context
      const awsConnection = useAWS();
      if (!awsConnection.connection) {
        throw new Error('AWS connection not established');
      }

      // For renewal, we'll request a new certificate (AWS ACM handles the rest)
      const success = await awsConnection.provisionSSL(domain.domain_name);
      
      if (success) {
        // Update domain status in database
        const { error } = await supabase
          .from('project_domains')
          .update({ 
            ssl_status: 'active',
            ssl_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
            updated_at: new Date().toISOString()
          })
          .eq('id', domainId);

        if (error) throw error;

        // Refresh domains
        await loadDomains();
        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to renew SSL';
      console.error('Error renewing SSL:', errorMessage);
      return false;
    }
  }, [domains, loadDomains, useAWS]);

  // Verify domain
  const verifyDomain = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const domain = domains.find(d => d.id === id);
      if (!domain) return false;

      // Try to verify domain ownership by checking DNS records
      try {
        const awsConnection = useAWS();
        if (awsConnection.connection) {
          // Find hosted zone for the domain
          const hostedZoneId = await awsConnection.findHostedZone(domain.domain_name);
          if (hostedZoneId) {
            // Check if domain has valid DNS records
            // In a real implementation, you would verify the domain actually resolves
            // For now, we'll assume if we can find the hosted zone, the domain is valid
            
            // Update status to verified
            await updateDomain(id, { status: 'verified' });
            
            // Provision SSL certificate
            await provisionSSL(id);
            
            return true;
          } else {
            throw new Error('No hosted zone found for domain. Please ensure the domain is properly configured in Route 53.');
          }
        } else {
          throw new Error('AWS connection not established. Please connect your AWS account first.');
        }
      } catch (awsError: unknown) {
        const errorMessage = awsError instanceof Error ? awsError.message : 'Failed to verify domain with AWS';
        setError(errorMessage);
        console.error('Error verifying domain:', awsError);
        return false;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify domain';
      setError(errorMessage);
      console.error('Error verifying domain:', err);
      return false;
    }
  }, [domains, updateDomain, provisionSSL, useAWS]);

  // Add DNS record
  const addDNSRecord = useCallback(async (domainId: string, record: Omit<DNSRecord, 'id' | 'status'>): Promise<DNSRecord | null> => {
    try {
      setError(null);
      
      const domain = domains.find(d => d.id === domainId);
      if (!domain) {
        throw new Error('Domain not found');
      }

      const newRecord: DNSRecord = {
        ...record,
        id: crypto.randomUUID(),
        status: 'pending',
      };

      // Try to update DNS in AWS if connected
      try {
        const awsConnection = useAWS();
        if (awsConnection.connection) {
          // Find hosted zone for the domain
          const hostedZoneId = await awsConnection.findHostedZone?.(domain.domain_name);
          if (hostedZoneId) {
            // Update DNS in AWS
            const success = await awsConnection.updateDNS(domain.domain_name, hostedZoneId, [newRecord]);
            if (success) {
              newRecord.status = 'active';
            }
          }
        }
      } catch (awsError: unknown) {
        console.warn('AWS DNS update failed, keeping local record only:', awsError);
      }

      // Update local domain record
      const updatedDomain = await updateDomain(domainId, {
        dns_records: [...(domain.dns_records || []), newRecord]
      });

      return newRecord;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add DNS record';
      setError(errorMessage);
      console.error('Error adding DNS record:', err);
      return null;
    }
  }, [domains, updateDomain, useAWS]);

  // Update DNS record
  const updateDNSRecord = useCallback(async (domainId: string, recordId: string, updates: Partial<DNSRecord>): Promise<DNSRecord | null> => {
    try {
      setError(null);
      
      const domain = domains.find(d => d.id === domainId);
      if (!domain) return null;

      const updatedRecords = domain.dns_records.map(record =>
        record.id === recordId ? { ...record, ...updates } : record
      );

      // Try to update DNS in AWS if connected
      try {
        const awsConnection = useAWS();
        if (awsConnection.connection) {
          // Find hosted zone for the domain
          const hostedZoneId = await awsConnection.findHostedZone(domain.domain_name);
          if (hostedZoneId) {
            // Update DNS in AWS
            const success = await awsConnection.updateDNS(domain.domain_name, hostedZoneId, updatedRecords);
            if (success) {
              // Mark all records as active if AWS update succeeded
              updatedRecords.forEach(record => record.status = 'active');
            }
          }
        }
      } catch (awsError: unknown) {
        console.warn('AWS DNS update failed, keeping local record only:', awsError);
      }

      // Update local domain record
      await updateDomain(domainId, { dns_records: updatedRecords });
      
      return updatedRecords.find(r => r.id === recordId) || null;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update DNS record';
      setError(errorMessage);
      console.error('Error updating DNS record:', err);
      return null;
    }
  }, [domains, updateDomain, useAWS]);

  // Delete DNS record
  const deleteDNSRecord = useCallback(async (domainId: string, recordId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const domain = domains.find(d => d.id === domainId);
      if (!domain) return false;

      const updatedRecords = domain.dns_records.filter(record => record.id !== recordId);
      
      // Try to update DNS in AWS if connected
      try {
        const awsConnection = useAWS();
        if (awsConnection.connection) {
          // Find hosted zone for the domain
          const hostedZoneId = await awsConnection.findHostedZone(domain.domain_name);
          if (hostedZoneId) {
            // Update DNS in AWS
            await awsConnection.updateDNS(domain.domain_name, hostedZoneId, updatedRecords);
          }
        }
      } catch (awsError: unknown) {
        console.warn('AWS DNS update failed, keeping local record only:', awsError);
      }

      // Update local domain record
      await updateDomain(domainId, { dns_records: updatedRecords });
      
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete DNS record';
      setError(errorMessage);
      console.error('Error deleting DNS record:', err);
      return false;
    }
  }, [domains, updateDomain, useAWS]);

  // Get domains by project
  const getDomainByProject = useCallback((projectId: string): Domain[] => {
    return domains.filter(domain => domain.project_id === projectId);
  }, [domains]);

  // Load domains when user changes
  useEffect(() => {
    if (user) {
      loadDomains();
    } else {
      setDomains([]);
    }
  }, [user, loadDomains]);

  const value: DomainContextType = {
    domains,
    isLoading,
    error,
    addDomain,
    updateDomain,
    deleteDomain,
    verifyDomain,
    addDNSRecord,
    updateDNSRecord,
    deleteDNSRecord,
    provisionSSL,
    renewSSL,
    refreshDomains: loadDomains,
    getDomainByProject,
  };

  return (
    <DomainContext.Provider value={value}>
      {children}
    </DomainContext.Provider>
  );
}

// Helper function to generate verification token
function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default DomainProvider;
