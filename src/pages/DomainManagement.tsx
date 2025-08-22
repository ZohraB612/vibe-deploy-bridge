import { useState, useEffect } from "react";
import { useDomains } from "@/contexts/DomainContext";
import { useProjects } from "@/contexts/ProjectContext";
import { useAWSStatus } from "@/hooks/use-aws-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Globe, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  Copy,
  RefreshCw,
  Trash2,
  Edit,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { DNSRecordDialog } from "@/components/dns-record-dialog";
import { useNavigate } from "react-router-dom";

export default function DomainManagement() {
  const { domains, isLoading, error, addDomain, verifyDomain, deleteDomain, refreshDomains, provisionSSL, renewSSL, addDNSRecord, updateDNSRecord, deleteDNSRecord } = useDomains();
  const { projects } = useProjects();
  const { toast } = useToast();
  const { hasAWSConnection, isLoading: isAWSLoading } = useAWSStatus();
  const navigate = useNavigate();

  // Redirect to AWS setup if user doesn't have AWS connection
  useEffect(() => {
    if (!isAWSLoading && hasAWSConnection === false) {
      navigate('/setup/aws', { replace: true });
    }
  }, [hasAWSConnection, isAWSLoading, navigate]);

  // Don't render domain management if still checking AWS status or if redirecting
  if (isAWSLoading || hasAWSConnection === false) {
    return null;
  }
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [domainName, setDomainName] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<'dns' | 'file' | 'meta'>('dns');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddDomain = async () => {
    if (!selectedProject || !domainName.trim()) {
      toast({
        title: "Error",
        description: "Please select a project and enter a domain name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newDomain = await addDomain({
        project_id: selectedProject,
        domain_name: domainName.trim(),
        verification_method: verificationMethod,
      });

      if (newDomain) {
        toast({
          title: "Success",
          description: `Domain ${domainName} added successfully`,
        });
        setIsAddDialogOpen(false);
        setDomainName("");
        setSelectedProject("");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to add domain",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    try {
      toast({
        title: "Verifying Domain",
        description: "Checking domain ownership and DNS configuration...",
      });
      
      const success = await verifyDomain(domainId);
      if (success) {
        toast({
          title: "Success",
          description: "Domain verified successfully! SSL certificate provisioning started.",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to verify domain",
        variant: "destructive",
      });
    }
  };

  const handleRenewSSL = async (domainId: string) => {
    try {
      toast({
        title: "Renewing SSL",
        description: "Requesting new SSL certificate...",
      });
      
      const success = await renewSSL(domainId);
      if (success) {
        toast({
          title: "Success",
          description: "SSL certificate renewed successfully!",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to renew SSL certificate",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    if (confirm(`Are you sure you want to delete domain ${domainName}?`)) {
      try {
        const success = await deleteDomain(domainId);
        if (success) {
          toast({
            title: "Success",
            description: `Domain ${domainName} deleted successfully`,
          });
        }
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to delete domain",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'verified':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'active':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSSLBadge = (sslStatus: string) => {
    switch (sslStatus) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'active':
        return <Badge variant="default"><Shield className="h-3 w-3 mr-1" />Active</Badge>;
      case 'expired':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">{sslStatus}</Badge>;
    }
  };

  const getVerificationInstructions = (domain: any) => {
    switch (domain.verification_method) {
      case 'dns':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Add this TXT record to your DNS:</p>
            <div className="bg-muted p-2 rounded text-sm font-mono">
              <div>Name: @</div>
              <div>Type: TXT</div>
              <div>Value: {domain.verification_token}</div>
              <div>TTL: 3600</div>
            </div>
          </div>
        );
      case 'file':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Upload this file to your domain root:</p>
            <div className="bg-muted p-2 rounded text-sm font-mono">
              <div>File: /.well-known/deployhub-verification.txt</div>
              <div>Content: {domain.verification_token}</div>
            </div>
          </div>
        );
      case 'meta':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Add this meta tag to your HTML head:</p>
            <div className="bg-muted p-2 rounded text-sm font-mono">
              {`<meta name="deployhub-verification" content="${domain.verification_token}" />`}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Domain Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your domains, DNS records, and SSL certificates
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={refreshDomains}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Domain</DialogTitle>
                <DialogDescription>
                  Add a new domain to your project
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project">Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="domain">Domain Name</Label>
                  <Input
                    id="domain"
                    placeholder="example.com"
                    value={domainName}
                    onChange={(e) => setDomainName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="verification">Verification Method</Label>
                  <Select value={verificationMethod} onValueChange={(value: any) => setVerificationMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dns">DNS Record</SelectItem>
                      <SelectItem value="file">File Upload</SelectItem>
                      <SelectItem value="meta">Meta Tag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddDomain} disabled={isSubmitting}>
                    {isSubmitting ? <LoadingSpinner size="sm" /> : "Add Domain"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {domains.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No domains yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first domain to get started with DNS management and SSL certificates
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {domains.map((domain) => (
            <Card key={domain.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-xl">{domain.domain_name}</CardTitle>
                      <CardDescription>
                        Project: {projects.find(p => p.id === domain.project_id)?.name || 'Unknown'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(domain.status)}
                    {getSSLBadge(domain.ssl_status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="dns">DNS Records</TabsTrigger>
                    <TabsTrigger value="ssl">SSL Status</TabsTrigger>
                    <TabsTrigger value="verification">Verification</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <p className="text-sm text-muted-foreground">{domain.status}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">SSL Status</Label>
                        <p className="text-sm text-muted-foreground">{domain.ssl_status}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Created</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(domain.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Last Updated</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(domain.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {domain.status === 'pending' && (
                        <Button onClick={() => handleVerifyDomain(domain.id)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify Domain
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Domain
                      </Button>
                      <Button variant="outline" size="sm">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Domain
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteDomain(domain.id, domain.domain_name)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="dns" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold">DNS Records</h4>
                      <DNSRecordDialog
                        domainId={domain.id}
                        onSave={addDNSRecord}
                        mode="add"
                      />
                    </div>
                    
                    {domain.dns_records.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No DNS records configured yet
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>TTL</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {domain.dns_records.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono">{record.type}</TableCell>
                              <TableCell className="font-mono">{record.name}</TableCell>
                              <TableCell className="font-mono">{record.value}</TableCell>
                              <TableCell>{record.ttl}</TableCell>
                              <TableCell>{getStatusBadge(record.status)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <DNSRecordDialog
                                    domainId={domain.id}
                                    record={record}
                                    onSave={(updates) => updateDNSRecord(domain.id, record.id, updates)}
                                    mode="edit"
                                    trigger={
                                      <Button variant="ghost" size="sm">
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    }
                                  />
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => deleteDNSRecord(domain.id, record.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="ssl" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold">SSL Certificate</h4>
                        {domain.ssl_status === 'active' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleRenewSSL(domain.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Renew
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Status</Label>
                          <p className="text-sm text-muted-foreground">{domain.ssl_status}</p>
                        </div>
                        {domain.ssl_expiry && (
                          <div>
                            <Label className="text-sm font-medium">Expires</Label>
                            <p className="text-sm text-muted-foreground">
                              {new Date(domain.ssl_expiry).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {domain.ssl_status === 'pending' && domain.status === 'verified' && (
                        <Button 
                          onClick={() => handleRenewSSL(domain.id)}
                          className="w-full"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Provision SSL Certificate
                        </Button>
                      )}
                      
                      {domain.ssl_status === 'pending' && domain.status !== 'verified' && (
                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            SSL certificate will be provisioned automatically after domain verification
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="verification" className="space-y-4">
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold">Domain Verification</h4>
                      
                      {domain.status === 'pending' ? (
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            To verify your domain, complete one of the following verification methods:
                          </p>
                          
                          {getVerificationInstructions(domain)}
                          
                          <div className="pt-4">
                            <Button onClick={() => handleVerifyDomain(domain.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Verify Domain
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">Domain Verified</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            Your domain has been successfully verified
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
