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
import { format } from 'date-fns';
import { AuditLogExportFilters, ExportFilters } from '@/components/AuditLogExportFilters';
import { ScheduledExportManager } from '@/components/ScheduledExportManager';
import { EmailAnalytics } from '@/components/EmailAnalytics';
import { BrandImageGenerator } from '@/components/BrandImageGenerator';
import { ContactManagement } from '@/components/ContactManagement';
import { BrandManagement } from '@/components/BrandManagement';
import { ShopManagement } from '@/components/ShopManagement';
import { DropManagement } from '@/components/DropManagement';
import { DropsCalendar } from '@/components/DropsCalendar';
import { MediaManagement } from '@/components/MediaManagement';
import { DataExports } from '@/components/DataExports';
import { Tables } from '@/integrations/supabase/types';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminStatsCards } from '@/components/AdminStatsCards';

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
  const [brands, setBrands] = useState<Tables<'brands'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("accounts");
  
  // Stats state
  const [stats, setStats] = useState({
    totalBrands: 0,
    totalShops: 0,
    upcomingDrops: 0,
    lockedAccounts: 0,
  });
  
  const [trends, setTrends] = useState<{
    brands?: { value: number; percentage: number; direction: "up" | "down" | "neutral" };
    shops?: { value: number; percentage: number; direction: "up" | "down" | "neutral" };
    drops?: { value: number; percentage: number; direction: "up" | "down" | "neutral" };
    locked?: { value: number; percentage: number; direction: "up" | "down" | "neutral" };
  }>({});

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

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) {
      return { value: current, percentage: 0, direction: "neutral" as const };
    }
    
    const change = current - previous;
    const percentage = (change / previous) * 100;
    
    return {
      value: Math.abs(change),
      percentage: Math.abs(percentage),
      direction: change > 0 ? "up" as const : change < 0 ? "down" as const : "neutral" as const,
    };
  };

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      const [
        loginRes, 
        ipRes, 
        auditRes, 
        brandsRes, 
        shopsRes, 
        dropsRes,
        // Trend data - last 7 days
        brandsLastWeek,
        shopsLastWeek,
        dropsLastWeek,
        // Trend data - previous 7 days (8-14 days ago)
        brandsPrevWeek,
        shopsPrevWeek,
        dropsPrevWeek,
      ] = await Promise.all([
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
          .limit(100),
        supabase
          .from('brands')
          .select('*')
          .order('name'),
        supabase
          .from('shops')
          .select('id, created_at'),
        supabase
          .from('drops')
          .select('id, status, created_at')
          .eq('status', 'upcoming'),
        // Last 7 days counts
        supabase
          .from('brands')
          .select('id')
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('shops')
          .select('id')
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('drops')
          .select('id')
          .eq('status', 'upcoming')
          .gte('created_at', sevenDaysAgo.toISOString()),
        // Previous 7 days counts (8-14 days ago)
        supabase
          .from('brands')
          .select('id')
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('shops')
          .select('id')
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('drops')
          .select('id')
          .eq('status', 'upcoming')
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString()),
      ]);

      if (loginRes.error) throw loginRes.error;
      if (ipRes.error) throw ipRes.error;
      if (auditRes.error) throw auditRes.error;

      setLoginAttempts(loginRes.data || []);
      setIpAttempts(ipRes.data || []);
      setAuditLogs(auditRes.data || []);
      setBrands(brandsRes.data || []);
      
      // Calculate locked accounts (those with locked_until in the future)
      const lockedCount = loginRes.data?.filter(
        attempt => attempt.locked_until && new Date(attempt.locked_until) > new Date()
      ).length || 0;
      
      // Calculate trends
      const brandsThisWeek = brandsLastWeek.data?.length || 0;
      const brandsPreviousWeek = brandsPrevWeek.data?.length || 0;
      
      const shopsThisWeek = shopsLastWeek.data?.length || 0;
      const shopsPreviousWeek = shopsPrevWeek.data?.length || 0;
      
      const dropsThisWeek = dropsLastWeek.data?.length || 0;
      const dropsPreviousWeek = dropsPrevWeek.data?.length || 0;
      
      // For locked accounts, we'll use a simple comparison (current vs average would need historical data)
      const lockedTrend = calculateTrend(lockedCount, 0); // Simplified for now
      
      setTrends({
        brands: calculateTrend(brandsThisWeek, brandsPreviousWeek),
        shops: calculateTrend(shopsThisWeek, shopsPreviousWeek),
        drops: calculateTrend(dropsThisWeek, dropsPreviousWeek),
        locked: { value: lockedCount, percentage: 0, direction: "neutral" }, // Simplified
      });
      
      // Update stats
      setStats({
        totalBrands: brandsRes.data?.length || 0,
        totalShops: shopsRes.data?.length || 0,
        upcomingDrops: dropsRes.data?.length || 0,
        lockedAccounts: lockedCount,
      });
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
      <div className="min-h-screen flex items-center justify-center bg-background lg:pt-14">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading...</p>
          <button
            onClick={() => navigate('/more')}
            className="mt-4 text-sm text-[#C4956A] hover:text-[#C4956A]/80 transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    navigate('/more');
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background pt-0 lg:pt-14">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1">
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage security, content, and analytics</p>
              </div>
              <Button
                variant="default"
                onClick={() => navigate('/analytics')}
              >
                View Analytics
              </Button>
            </div>
          </header>

          <main className="p-6">
            <AdminStatsCards
              totalBrands={stats.totalBrands}
              totalShops={stats.totalShops}
              upcomingDrops={stats.upcomingDrops}
              lockedAccounts={stats.lockedAccounts}
              loading={loading}
              trends={trends}
            />
            
            {activeTab === "accounts" && (
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
            )}

            {activeTab === "ips" && (
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
            )}

            {activeTab === "audit" && (
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
            )}

            {activeTab === "scheduled" && (
              <ScheduledExportManager />
            )}

            {activeTab === "analytics" && (
              <EmailAnalytics />
            )}

            {activeTab === "contact-messages" && (
              <ContactManagement />
            )}

            {activeTab === "brand-images" && (
              <BrandImageGenerator 
                brands={brands} 
                onComplete={fetchAttempts} 
              />
            )}

            {activeTab === "brands" && (
              <BrandManagement />
            )}

            {activeTab === "shops" && (
              <ShopManagement />
            )}

            {activeTab === "drops" && (
              <DropManagement />
            )}

            {activeTab === "calendar" && (
              <DropsCalendar />
            )}

            {activeTab === "media" && (
              <MediaManagement />
            )}

            {activeTab === "data-exports" && (
              <DataExports />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
