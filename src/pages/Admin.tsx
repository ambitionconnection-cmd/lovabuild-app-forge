import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Unlock, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { AuditLogExportFilters, ExportFilters } from '@/components/AuditLogExportFilters';
import { ScheduledExportManager } from '@/components/ScheduledExportManager';
import { EmailAnalytics } from '@/components/EmailAnalytics';

interface LoginAttempt {
  id: string;
  email: string;
  attempts: number;
  locked_until: string | null;
  last_attempt: string;
}

interface IpAttempt {
  id: string;
  ip_address: string;
  attempts: number;
  locked_until: string | null;
  last_attempt: string;
}

interface AuditLog {
  id: string;
  event_type: string;
  user_email: string | null;
  ip_address: string | null;
  event_data: any;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [ipAttempts, setIpAttempts] = useState<IpAttempt[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Access denied: Admin privileges required');
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAttempts();
    }
  }, [isAdmin]);

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const [loginRes, ipRes, auditRes] = await Promise.all([
        supabase
          .from('login_attempts')
          .select('*')
          .order('last_attempt', { ascending: false }),
        supabase
          .from('ip_login_attempts')
          .select('*')
          .order('last_attempt', { ascending: false }),
        supabase
          .from('security_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (loginRes.error) throw loginRes.error;
      if (ipRes.error) throw ipRes.error;
      if (auditRes.error) throw auditRes.error;

      setLoginAttempts(loginRes.data || []);
      setIpAttempts(ipRes.data || []);
      setAuditLogs(auditRes.data || []);
    } catch (error) {
      console.error('Error fetching attempts:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const unlockEmail = async (id: string, email: string) => {
    try {
      const { error } = await supabase
        .from('login_attempts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log admin action
      await supabase.functions.invoke('log-security-event', {
        body: {
          eventType: 'admin_unlock_account',
          userEmail: email,
          eventData: { accountId: id }
        }
      });

      toast.success(`Unlocked account: ${email}`);
      fetchAttempts();
    } catch (error) {
      console.error('Error unlocking account:', error);
      toast.error('Failed to unlock account');
    }
  };

  const unlockIp = async (id: string, ip: string) => {
    try {
      const { error } = await supabase
        .from('ip_login_attempts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log admin action
      await supabase.functions.invoke('log-security-event', {
        body: {
          eventType: 'admin_unlock_ip',
          eventData: { ipAddress: ip, ipAttemptId: id }
        }
      });

      toast.success(`Unlocked IP: ${ip}`);
      fetchAttempts();
    } catch (error) {
      console.error('Error unlocking IP:', error);
      toast.error('Failed to unlock IP');
    }
  };

  const isLocked = (lockedUntil: string | null) => {
    return lockedUntil && new Date(lockedUntil) > new Date();
  };

  const exportToCSV = async (filters?: ExportFilters) => {
    try {
      // Build query with filters
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.startDate) {
          query = query.gte('created_at', new Date(filters.startDate).toISOString());
        }
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endDate.toISOString());
        }
        if (filters.eventType && filters.eventType !== 'all') {
          query = query.eq('event_type', filters.eventType);
        }
        if (filters.userEmail) {
          query = query.ilike('user_email', `%${filters.userEmail}%`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No audit logs match the selected filters');
        return;
      }

      // Define CSV headers
      const headers = ['Date/Time', 'Event Type', 'User Email', 'IP Address', 'Event Data'];
      
      // Convert data to CSV rows
      const rows = data.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.event_type,
        log.user_email || 'N/A',
        log.ip_address || 'N/A',
        JSON.stringify(log.event_data || {})
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `security_audit_log_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${data.length} audit log entries to CSV`);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Failed to export audit logs');
    }
  };

  const exportToJSON = async (filters?: ExportFilters) => {
    try {
      // Build query with filters
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters) {
        if (filters.startDate) {
          query = query.gte('created_at', new Date(filters.startDate).toISOString());
        }
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endDate.toISOString());
        }
        if (filters.eventType && filters.eventType !== 'all') {
          query = query.eq('event_type', filters.eventType);
        }
        if (filters.userEmail) {
          query = query.ilike('user_email', `%${filters.userEmail}%`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No audit logs match the selected filters');
        return;
      }

      // Create formatted JSON
      const jsonContent = JSON.stringify(data, null, 2);

      // Create and download file
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `security_audit_log_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${data.length} audit log entries to JSON`);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      toast.error('Failed to export audit logs');
    }
  };

  const handleExportWithFilters = (format: 'csv' | 'json', filters: ExportFilters) => {
    if (format === 'csv') {
      exportToCSV(filters);
    } else {
      exportToJSON(filters);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Security Dashboard</h1>
            <p className="text-muted-foreground">Monitor and manage login security</p>
          </div>
        </div>

        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="accounts">Locked Accounts</TabsTrigger>
            <TabsTrigger value="ips">Locked IPs</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Exports</TabsTrigger>
            <TabsTrigger value="analytics">Email Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <CardTitle>Email-Based Login Attempts</CardTitle>
                <CardDescription>
                  Accounts are locked after 5 failed attempts for 15 minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loginAttempts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No login attempts recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Attempt</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginAttempts.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-medium">{attempt.email}</TableCell>
                          <TableCell>{attempt.attempts}</TableCell>
                          <TableCell>
                            {isLocked(attempt.locked_until) ? (
                              <Badge variant="destructive">Locked</Badge>
                            ) : (
                              <Badge variant="secondary">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>{new Date(attempt.last_attempt).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unlockEmail(attempt.id, attempt.email)}
                            >
                              <Unlock className="h-4 w-4 mr-2" />
                              Unlock
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ips">
            <Card>
              <CardHeader>
                <CardTitle>IP-Based Login Attempts</CardTitle>
                <CardDescription>
                  IPs are locked after 10 failed attempts for 30 minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ipAttempts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No IP attempts recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Attempt</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ipAttempts.map((attempt) => (
                        <TableRow key={attempt.id}>
                          <TableCell className="font-mono">{attempt.ip_address}</TableCell>
                          <TableCell>{attempt.attempts}</TableCell>
                          <TableCell>
                            {isLocked(attempt.locked_until) ? (
                              <Badge variant="destructive">Locked</Badge>
                            ) : (
                              <Badge variant="secondary">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>{new Date(attempt.last_attempt).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unlockIp(attempt.id, attempt.ip_address)}
                            >
                              <Unlock className="h-4 w-4 mr-2" />
                              Unlock
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Security Audit Log</CardTitle>
                    <CardDescription>
                      Complete history of security events and admin actions (last 100 events)
                    </CardDescription>
                  </div>
                  <AuditLogExportFilters onExport={handleExportWithFilters} />
                </div>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No audit logs recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>User Email</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              log.event_type.includes('locked') ? 'destructive' :
                              log.event_type.includes('success') ? 'default' :
                              log.event_type.includes('failed') ? 'secondary' :
                              'outline'
                            }>
                              {log.event_type.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {log.user_email || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ip_address || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {log.event_data ? JSON.stringify(log.event_data) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled">
            <ScheduledExportManager />
          </TabsContent>

          <TabsContent value="analytics">
            <EmailAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
