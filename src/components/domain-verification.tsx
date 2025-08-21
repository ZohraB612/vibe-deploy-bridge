import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Globe,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Copy,
  Plus,
  AlertTriangle,
  ExternalLink,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DomainRecord {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
  ttl: number;
  required: boolean;
}

interface Domain {
  id: string;
  domain: string;
  status: "pending" | "verified" | "failed" | "configuring";
  sslStatus: "pending" | "active" | "failed" | "expired";
  verificationProgress: number;
  lastChecked: Date;
  expiresAt?: Date;
  dnsRecords: DomainRecord[];
  errors?: string[];
}

interface DomainVerificationProps {
  projectId: string;
}

export function DomainVerification({ projectId }: DomainVerificationProps) {
  const { toast } = useToast();
  const [domains, setDomains] = useState<Domain[]>([
    {
      id: "1",
      domain: "myapp.com",
      status: "verified",
      sslStatus: "active",
      verificationProgress: 100,
      lastChecked: new Date(Date.now() - 5 * 60 * 1000),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      dnsRecords: [
        { type: "A", name: "@", value: "185.158.133.1", ttl: 300, required: true },
        { type: "A", name: "www", value: "185.158.133.1", ttl: 300, required: true },
        { type: "TXT", name: "_acme-challenge", value: "abc123def456", ttl: 60, required: true }
      ]
    },
    {
      id: "2",
      domain: "staging.myapp.com",
      status: "configuring",
      sslStatus: "pending",
      verificationProgress: 65,
      lastChecked: new Date(Date.now() - 2 * 60 * 1000),
      dnsRecords: [
        { type: "A", name: "staging", value: "185.158.133.1", ttl: 300, required: true },
        { type: "TXT", name: "_acme-challenge.staging", value: "xyz789uvw012", ttl: 60, required: true }
      ],
      errors: ["DNS propagation in progress", "SSL certificate generation pending"]
    },
    {
      id: "3",
      domain: "api.myapp.com",
      status: "failed",
      sslStatus: "failed",
      verificationProgress: 25,
      lastChecked: new Date(Date.now() - 30 * 60 * 1000),
      dnsRecords: [
        { type: "A", name: "api", value: "185.158.133.1", ttl: 300, required: true }
      ],
      errors: ["A record not found", "Domain not pointing to our servers"]
    }
  ]);

  const [newDomain, setNewDomain] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [checkingDomains, setCheckingDomains] = useState<Set<string>>(new Set());

  const getStatusIcon = (status: Domain["status"]) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "configuring":
        return <Clock className="h-4 w-4 text-warning animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSSLIcon = (status: Domain["sslStatus"]) => {
    switch (status) {
      case "active":
        return <Shield className="h-4 w-4 text-success" />;
      case "failed":
        return <Shield className="h-4 w-4 text-destructive" />;
      case "expired":
        return <Shield className="h-4 w-4 text-warning" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-success";
    if (progress >= 50) return "bg-warning";
    return "bg-destructive";
  };

  const handleAddDomain = () => {
    if (!newDomain.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid domain",
        variant: "destructive"
      });
      return;
    }

    const domain: Domain = {
      id: Date.now().toString(),
      domain: newDomain.toLowerCase(),
      status: "pending",
      sslStatus: "pending", 
      verificationProgress: 0,
      lastChecked: new Date(),
      dnsRecords: [
        { type: "A", name: "@", value: "185.158.133.1", ttl: 300, required: true },
        { type: "A", name: "www", value: "185.158.133.1", ttl: 300, required: true }
      ]
    };

    setDomains(prev => [...prev, domain]);
    setNewDomain("");
    setIsAddDialogOpen(false);

    toast({
      title: "Domain added",
      description: `${domain.domain} has been added for verification`,
    });

    // Start verification process
    setTimeout(() => {
      checkDomainStatus(domain.id);
    }, 1000);
  };

  const checkDomainStatus = async (domainId: string) => {
    setCheckingDomains(prev => new Set([...prev, domainId]));
    
    // Simulate DNS checking
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setDomains(prev => prev.map(domain => {
      if (domain.id === domainId) {
        const progress = Math.min(domain.verificationProgress + 35, 100);
        return {
          ...domain,
          verificationProgress: progress,
          status: progress >= 100 ? "verified" : "configuring",
          sslStatus: progress >= 100 ? "active" : "pending",
          lastChecked: new Date(),
          expiresAt: progress >= 100 ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : undefined,
          errors: progress >= 100 ? undefined : ["DNS propagation in progress"]
        };
      }
      return domain;
    }));

    setCheckingDomains(prev => {
      const next = new Set(prev);
      next.delete(domainId);
      return next;
    });

    toast({
      title: "Domain check complete",
      description: "DNS records and SSL status updated"
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "DNS record value copied"
    });
  };

  const formatTimeRemaining = (date: Date) => {
    const days = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Custom Domains</CardTitle>
            <Badge variant="outline" className="text-xs">
              {domains.length} domains
            </Badge>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-3 w-3 mr-1" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Domain</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="domain">Domain Name</Label>
                  <Input
                    id="domain"
                    placeholder="example.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your domain without protocol (https://)
                  </p>
                </div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Make sure you have access to your domain's DNS settings before adding it.
                  </AlertDescription>
                </Alert>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddDomain}>
                    Add Domain
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {domains.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No custom domains configured</p>
            <p className="text-sm">Add your first domain to get started</p>
          </div>
        ) : (
          domains.map((domain) => (
            <Card key={domain.id} className="p-4">
              <div className="space-y-4">
                {/* Domain Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{domain.domain}</h3>
                    <Badge className={
                      domain.status === "verified" 
                        ? "bg-success text-success-foreground" 
                        : domain.status === "failed"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-warning text-warning-foreground"
                    }>
                      {getStatusIcon(domain.status)}
                      <span className="ml-1 capitalize">{domain.status}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => checkDomainStatus(domain.id)}
                      disabled={checkingDomains.has(domain.id)}
                      className="h-8"
                    >
                      {checkingDomains.has(domain.id) ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      Check Status
                    </Button>
                    {domain.status === "verified" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                        className="h-8"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Visit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Verification Progress</span>
                    <span>{domain.verificationProgress}%</span>
                  </div>
                  <Progress value={domain.verificationProgress} className="h-2" />
                </div>

                {/* SSL Status */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getSSLIcon(domain.sslStatus)}
                    <span className="text-sm font-medium">SSL Certificate</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {domain.sslStatus}
                    </Badge>
                  </div>
                  {domain.expiresAt && (
                    <div className="text-xs text-muted-foreground">
                      Expires in {formatTimeRemaining(domain.expiresAt)}
                    </div>
                  )}
                </div>

                {/* DNS Records */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">Required DNS Records</h4>
                    <Badge variant="outline" className="text-xs">
                      {domain.dnsRecords.length} records
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {domain.dnsRecords.map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                        <div className="flex items-center gap-4">
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            {record.type}
                          </Badge>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono">{record.name}</code>
                              <span className="text-xs text-muted-foreground">→</span>
                              <code className="text-sm font-mono text-primary">{record.value}</code>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              TTL: {record.ttl}s
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(record.value)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Errors */}
                {domain.errors && domain.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {domain.errors.map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Last Checked */}
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                  <span>Last checked: {domain.lastChecked.toLocaleString()}</span>
                  {domain.status === "verified" && (
                    <div className="flex items-center gap-1 text-success">
                      <Zap className="h-3 w-3" />
                      <span>Live & Secure</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}