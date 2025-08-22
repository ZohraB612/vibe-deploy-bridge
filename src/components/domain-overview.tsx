import { useDomains } from "@/contexts/DomainContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Shield, CheckCircle, Clock, AlertTriangle, Plus } from "lucide-react";
import { Link } from "react-router-dom";

interface DomainOverviewProps {
  projectId: string;
  showAddButton?: boolean;
}

export function DomainOverview({ projectId, showAddButton = true }: DomainOverviewProps) {
  const { getDomainByProject } = useDomains();
  const domains = getDomainByProject(projectId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'verified':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'active':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
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
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">{sslStatus}</Badge>;
    }
  };

  if (domains.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domains
          </CardTitle>
          <CardDescription>
            No domains configured for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showAddButton && (
            <Link to="/domains">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Domain
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Domains ({domains.length})
        </CardTitle>
        <CardDescription>
          Domain configuration and SSL status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {domains.map((domain) => (
            <div key={domain.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{domain.domain_name}</span>
                  {getStatusBadge(domain.status)}
                  {getSSLBadge(domain.ssl_status)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {domain.dns_records.length} DNS records • 
                  {domain.verification_method === 'dns' ? 'DNS verification' : 
                   domain.verification_method === 'file' ? 'File verification' : 'Meta tag verification'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/domains">
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </Link>
              </div>
            </div>
          ))}
          
          {showAddButton && (
            <div className="pt-2">
              <Link to="/domains">
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Domain
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
