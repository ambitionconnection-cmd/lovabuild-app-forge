import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Calendar, Plus, Trash2, Clock, Send } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduledExport {
  id: string;
  admin_email: string;
  schedule_type: 'daily' | 'weekly';
  export_format: 'csv' | 'json';
  filters: any;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
}

const EVENT_TYPES = [
  { value: 'all', label: 'All Events' },
  { value: 'login_success', label: 'Login Success' },
  { value: 'login_failed', label: 'Login Failed' },
  { value: 'account_locked', label: 'Account Locked' },
  { value: 'ip_locked', label: 'IP Locked' },
  { value: 'admin_unlock_account', label: 'Admin Unlock Account' },
  { value: 'admin_unlock_ip', label: 'Admin Unlock IP' },
];

export const ScheduledExportManager = () => {
  const [exports, setExports] = useState<ScheduledExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [formData, setFormData] = useState({
    schedule_type: 'daily',
    export_format: 'csv',
    filters: {
      eventType: 'all',
      userEmail: '',
    }
  });

  useEffect(() => {
    fetchScheduledExports();
  }, []);

  const fetchScheduledExports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('scheduled_audit_exports')
        .select('*')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExports((data || []) as ScheduledExport[]);
    } catch (error) {
      console.error('Error fetching scheduled exports:', error);
      toast.error('Failed to load scheduled exports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error('User email not found');
        return;
      }

      const { error } = await supabase
        .from('scheduled_audit_exports')
        .insert({
          admin_id: user.id,
          admin_email: user.email,
          schedule_type: formData.schedule_type,
          export_format: formData.export_format,
          filters: formData.filters,
        });

      if (error) throw error;

      toast.success('Scheduled export created successfully');
      setDialogOpen(false);
      fetchScheduledExports();
      
      // Reset form
      setFormData({
        schedule_type: 'daily',
        export_format: 'csv',
        filters: {
          eventType: 'all',
          userEmail: '',
        }
      });
    } catch (error) {
      console.error('Error creating scheduled export:', error);
      toast.error('Failed to create scheduled export');
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('scheduled_audit_exports')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Export ${!currentState ? 'activated' : 'deactivated'}`);
      fetchScheduledExports();
    } catch (error) {
      console.error('Error toggling export:', error);
      toast.error('Failed to update export');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_audit_exports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Scheduled export deleted');
      fetchScheduledExports();
    } catch (error) {
      console.error('Error deleting export:', error);
      toast.error('Failed to delete export');
    }
  };

  const handleTestNow = async (id: string, adminEmail: string) => {
    setTestingId(id);
    try {
      toast.info('Sending test export...');
      
      const { data, error } = await supabase.functions.invoke('send-scheduled-audit-export', {
        body: { exportId: id }
      });

      if (error) throw error;

      const result = data?.results?.[0];
      
      if (result?.status === 'success') {
        toast.success(`Test export sent to ${adminEmail} with ${result.count} events`);
        fetchScheduledExports(); // Refresh to show updated last_run_at
      } else if (result?.status === 'no_data') {
        toast.warning(result.message || 'No audit logs match the configured filters');
      } else if (result?.status === 'error') {
        toast.error(`Failed to send export: ${result.error}`);
      } else {
        toast.error('Failed to send test export');
      }
    } catch (error) {
      console.error('Error testing export:', error);
      toast.error('Failed to trigger test export');
    } finally {
      setTestingId(null);
    }
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      // Build query with current filters
      let query = supabase
        .from('security_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (formData.filters.eventType && formData.filters.eventType !== 'all') {
        query = query.eq('event_type', formData.filters.eventType);
      }
      if (formData.filters.userEmail) {
        query = query.ilike('user_email', `%${formData.filters.userEmail}%`);
      }

      // Fetch first 10 records and total count
      const { data, error, count } = await query.limit(10);

      if (error) throw error;

      setPreviewData(data || []);
      setPreviewTotal(count || 0);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Error fetching preview:', error);
      toast.error('Failed to load preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scheduled Exports</CardTitle>
            <CardDescription>
              Automatically email audit logs on a schedule
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Scheduled Export</DialogTitle>
                <DialogDescription>
                  Configure automatic email delivery of audit logs
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select
                    value={formData.schedule_type}
                    onValueChange={(value) => setFormData({ ...formData, schedule_type: value as 'daily' | 'weekly' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select
                    value={formData.export_format}
                    onValueChange={(value) => setFormData({ ...formData, export_format: value as 'csv' | 'json' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Event Type Filter</Label>
                  <Select
                    value={formData.filters.eventType}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      filters: { ...formData.filters, eventType: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>User Email Filter (Optional)</Label>
                  <Input
                    type="email"
                    placeholder="Filter by email..."
                    value={formData.filters.userEmail}
                    onChange={(e) => setFormData({
                      ...formData,
                      filters: { ...formData.filters, userEmail: e.target.value }
                    })}
                  />
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                  disabled={loadingPreview}
                  className="w-full sm:w-auto"
                >
                  {loadingPreview ? 'Loading...' : 'Preview Data'}
                </Button>
                <div className="flex gap-2 w-full sm:w-auto ml-auto">
                  <Button
                    variant="ghost"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>Create Schedule</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Export Preview</DialogTitle>
            <DialogDescription>
              Showing first 10 of {previewTotal} total audit log{previewTotal !== 1 ? 's' : ''} matching your filters
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {previewData.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No audit logs match the selected filters
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.event_type.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user_email || '-'}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {log.ip_address || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : exports.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No scheduled exports configured
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Schedule</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Filters</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exports.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{exp.schedule_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{exp.export_format.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {exp.filters?.eventType !== 'all' && (
                      <div>Event: {exp.filters.eventType}</div>
                    )}
                    {exp.filters?.userEmail && (
                      <div>Email: {exp.filters.userEmail}</div>
                    )}
                    {(!exp.filters?.eventType || exp.filters.eventType === 'all') && !exp.filters?.userEmail && (
                      <span className="text-muted-foreground">All events</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {exp.last_run_at ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(exp.last_run_at), 'MMM d, yyyy')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={exp.is_active}
                      onCheckedChange={() => handleToggleActive(exp.id, exp.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestNow(exp.id, exp.admin_email)}
                        disabled={testingId === exp.id}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {testingId === exp.id ? 'Sending...' : 'Test Now'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(exp.id)}
                        disabled={testingId === exp.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
