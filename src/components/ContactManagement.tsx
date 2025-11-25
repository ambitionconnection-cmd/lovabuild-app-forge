import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, Mail, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  inquiry_type: string;
  is_resolved: boolean;
  created_at: string;
}

export const ContactManagement = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching contact submissions:', error);
      toast.error('Failed to load contact submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleToggleResolved = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ is_resolved: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Message marked as ${!currentStatus ? 'resolved' : 'unresolved'}`);
      fetchSubmissions();
    } catch (error) {
      console.error('Error updating submission:', error);
      toast.error('Failed to update message status');
    }
  };

  const getInquiryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'new-submission': 'New Submission',
      'correction': 'Correction',
      'partnership': 'Partnership',
      'other': 'Other'
    };
    return labels[type] || type;
  };

  const getInquiryTypeBadgeVariant = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'new-submission': 'default',
      'correction': 'destructive',
      'partnership': 'secondary',
      'other': 'outline'
    };
    return variants[type] || 'outline';
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Contact Submissions</CardTitle>
          <CardDescription>
            View and manage messages from users ({submissions.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No contact submissions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="text-sm">
                        {format(new Date(submission.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getInquiryTypeBadgeVariant(submission.inquiry_type)}>
                          {getInquiryTypeLabel(submission.inquiry_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{submission.name}</TableCell>
                      <TableCell>
                        <a 
                          href={`mailto:${submission.email}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Mail className="w-3 h-3" />
                          {submission.email}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {submission.subject || '-'}
                      </TableCell>
                      <TableCell>
                        {submission.is_resolved ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500">
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant={submission.is_resolved ? "outline" : "default"}
                            onClick={() => handleToggleResolved(submission.id, submission.is_resolved)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contact Submission Details</DialogTitle>
            <DialogDescription>
              {selectedSubmission && (
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedSubmission.created_at), 'MMMM dd, yyyy HH:mm')}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedSubmission.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a 
                    href={`mailto:${selectedSubmission.email}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {selectedSubmission.email}
                  </a>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant={getInquiryTypeBadgeVariant(selectedSubmission.inquiry_type)}>
                  {getInquiryTypeLabel(selectedSubmission.inquiry_type)}
                </Badge>
              </div>
              {selectedSubmission.subject && (
                <div>
                  <p className="text-sm text-muted-foreground">Subject</p>
                  <p className="font-medium">{selectedSubmission.subject}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Message</p>
                <div className="bg-muted p-4 rounded-md">
                  <p className="whitespace-pre-wrap">{selectedSubmission.message}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  Status: {selectedSubmission.is_resolved ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                      Resolved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                      Pending
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={() => {
                    handleToggleResolved(selectedSubmission.id, selectedSubmission.is_resolved);
                    setSelectedSubmission(null);
                  }}
                >
                  Mark as {selectedSubmission.is_resolved ? 'Unresolved' : 'Resolved'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
