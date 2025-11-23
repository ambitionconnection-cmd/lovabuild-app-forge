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

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [ipAttempts, setIpAttempts] = useState<IpAttempt[]>([]);
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
      const [loginRes, ipRes] = await Promise.all([
        supabase
          .from('login_attempts')
          .select('*')
          .order('last_attempt', { ascending: false }),
        supabase
          .from('ip_login_attempts')
          .select('*')
          .order('last_attempt', { ascending: false })
      ]);

      if (loginRes.error) throw loginRes.error;
      if (ipRes.error) throw ipRes.error;

      setLoginAttempts(loginRes.data || []);
      setIpAttempts(ipRes.data || []);
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
        </Tabs>
      </div>
    </div>
  );
}
