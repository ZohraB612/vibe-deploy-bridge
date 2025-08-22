import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DNSRecord } from "@/contexts/DomainContext";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Plus, Edit } from "lucide-react";

interface DNSRecordDialogProps {
  domainId: string;
  record?: DNSRecord;
  onSave: (record: Omit<DNSRecord, 'id' | 'status'>) => Promise<DNSRecord | null>;
  trigger?: React.ReactNode;
  mode: 'add' | 'edit';
}

export function DNSRecordDialog({ domainId, record, onSave, trigger, mode }: DNSRecordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'A' as DNSRecord['type'],
    name: '',
    value: '',
    ttl: 3600,
    priority: undefined as number | undefined,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (record && mode === 'edit') {
      setFormData({
        type: record.type,
        name: record.name,
        value: record.value,
        ttl: record.ttl,
        priority: record.priority,
      });
    }
  }, [record, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.value.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const savedRecord = await onSave(formData);
      if (savedRecord) {
        toast({
          title: "Success",
          description: `DNS record ${mode === 'add' ? 'added' : 'updated'} successfully`,
        });
        setIsOpen(false);
        resetForm();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to ${mode} DNS record`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'A',
      name: '',
      value: '',
      ttl: 3600,
      priority: undefined,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const getRecordTypeDescription = (type: DNSRecord['type']) => {
    switch (type) {
      case 'A':
        return 'IPv4 address record';
      case 'AAAA':
        return 'IPv6 address record';
      case 'CNAME':
        return 'Canonical name record';
      case 'MX':
        return 'Mail exchange record';
      case 'TXT':
        return 'Text record';
      case 'NS':
        return 'Name server record';
      default:
        return '';
    }
  };

  const getTTLOptions = () => [
    { value: 60, label: '1 minute' },
    { value: 300, label: '5 minutes' },
    { value: 900, label: '15 minutes' },
    { value: 1800, label: '30 minutes' },
    { value: 3600, label: '1 hour' },
    { value: 7200, label: '2 hours' },
    { value: 14400, label: '4 hours' },
    { value: 28800, label: '8 hours' },
    { value: 86400, label: '1 day' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant={mode === 'add' ? 'default' : 'outline'}>
            {mode === 'add' ? (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add DNS Record' : 'Edit DNS Record'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' ? 'Add a new DNS record to your domain' : 'Update the DNS record'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Record Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: DNSRecord['type']) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A (IPv4)</SelectItem>
                  <SelectItem value="AAAA">AAAA (IPv6)</SelectItem>
                  <SelectItem value="CNAME">CNAME</SelectItem>
                  <SelectItem value="MX">MX</SelectItem>
                  <SelectItem value="TXT">TXT</SelectItem>
                  <SelectItem value="NS">NS</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {getRecordTypeDescription(formData.type)}
              </p>
            </div>
            
            <div>
              <Label htmlFor="ttl">TTL (seconds)</Label>
              <Select 
                value={formData.ttl.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, ttl: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getTTLOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder={formData.type === 'A' ? '@ or subdomain' : 'Record name'}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.type === 'A' ? 'Use @ for root domain or enter subdomain (e.g., www)' : 
               formData.type === 'MX' ? 'Usually @ for root domain' : 'Record name'}
            </p>
          </div>

          <div>
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              placeholder={formData.type === 'A' ? '192.168.1.1' : 'Record value'}
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.type === 'A' ? 'IPv4 address (e.g., 192.168.1.1)' :
               formData.type === 'AAAA' ? 'IPv6 address' :
               formData.type === 'CNAME' ? 'Target domain (e.g., example.com)' :
               formData.type === 'MX' ? 'Mail server domain with priority (e.g., 10 mail.example.com)' :
               formData.type === 'TXT' ? 'Text content' :
               formData.type === 'NS' ? 'Name server domain' : 'Record value'}
            </p>
          </div>

          {formData.type === 'MX' && (
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="65535"
                placeholder="10"
                value={formData.priority || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  priority: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers have higher priority
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoadingSpinner size="sm" />
              ) : (
                mode === 'add' ? 'Add Record' : 'Update Record'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
