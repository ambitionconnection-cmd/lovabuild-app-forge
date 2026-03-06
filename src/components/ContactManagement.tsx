import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { CheckCircle, XCircle, Mail, Calendar, ExternalLink } from "lucide-react";
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

// Parse structured submission messages into key-value pairs
function parseSubmissionMessage(message: string) {
  const fields: Record<string, string> = {};
  const lines = message.split('\n');
  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('===') || trimmed === '---' || trimmed === '') continue;

    const colonMatch = trimmed.match(/^([A-Za-z\/\s]+?):\s*(.*)$/);
    if (colonMatch && !trimmed.startsWith('http')) {
      if (currentKey) fields[currentKey] = currentValue.trim();
      currentKey = colonMatch[1].trim();
      currentValue = colonMatch[2];
    } else if (currentKey) {
      currentValue += '\n' + trimmed;
    }
  }
  if (currentKey) fields[currentKey] = currentValue.trim();
  return fields;
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.match(urlRegex) || [];
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)/i.test(url) || url.includes('/storage/v1/object/public/');
}

export const ContactManagement = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  useEffect(() => { fetchSubmissions(); }, []);

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
      toast.error('Failed to update message status');
    }
  };

  const handleAcceptShop = async (submission: ContactSubmission) => {
    setActionLoading(true);
    try {
      const fields = parseSubmissionMessage(submission.message);
      const shopName = fields['Shop Name'] || 'Unnamed Shop';
      const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Get first photo URL as image
      const photoText = fields['Photos'] || '';
      const photoUrls = extractUrls(photoText);
      const logoText = fields['Logo'] || '';
      const logoUrls = extractUrls(logoText);

      const { error } = await supabase.from('shops').insert({
        name: shopName,
        slug: slug + '-' + Date.now(),
        address: fields['Address'] || '',
        city: fields['City'] || '',
        country: fields['Country'] || '',
        phone: fields['Phone'] !== 'Not provided' ? fields['Phone'] : null,
        email: fields['Email'] !== 'Not provided' ? fields['Email'] : null,
        official_site: fields['Website'] !== 'Not provided' ? fields['Website'] : null,
        description: fields['Description'] !== 'Not provided' ? fields['Description'] : null,
        image_url: photoUrls[0] || logoUrls[0] || null,
        is_active: false, // Inactive until admin manually activates
        is_unique_shop: false,
        category: (fields['Category'] && fields['Category'] !== 'Not specified') 
          ? fields['Category'] as any : null,
      });

      if (error) throw error;

      // Mark as resolved
      await supabase.from('contact_submissions').update({ is_resolved: true }).eq('id', submission.id);

      toast.success(`Shop "${shopName}" added to Shop Management (inactive). Activate it manually to publish.`);
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Error accepting shop:', error);
      toast.error('Failed to create shop');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptBrand = async (submission: ContactSubmission) => {
    setActionLoading(true);
    try {
      const fields = parseSubmissionMessage(submission.message);
      const brandName = fields['Brand Name'] || 'Unnamed Brand';
      const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const logoText = fields['Logo'] || '';
      const logoUrls = extractUrls(logoText);
      const instagramRaw = fields['Instagram'] || '';
      const instagramUrl = instagramRaw.startsWith('@') 
        ? `https://instagram.com/${instagramRaw.replace('@', '')}` 
        : instagramRaw !== 'Not provided' ? instagramRaw : null;
      const tiktokRaw = fields['TikTok'] || '';
      const tiktokUrl = tiktokRaw.startsWith('@')
        ? `https://tiktok.com/${tiktokRaw}`
        : tiktokRaw !== 'Not provided' ? tiktokRaw : null;

      const { error } = await supabase.from('brands').insert({
        name: brandName,
        slug: slug + '-' + Date.now(),
        description: fields['Short Description'] || fields['Description'] || null,
        history: fields['Full Description'] !== 'Not provided' ? fields['Full Description'] : null,
        official_website: fields['Website'] !== 'Not provided' ? fields['Website'] : null,
        instagram_url: instagramUrl,
        tiktok_url: tiktokUrl,
        logo_url: logoUrls[0] || null,
        country: fields['Country'] || null,
        category: (fields['Category'] && fields['Category'] !== 'Not specified')
          ? fields['Category'] as any : null,
        is_active: false, // Inactive until admin manually activates
        brand_tier: 'emerging' as any,
      });

      if (error) throw error;

      await supabase.from('contact_submissions').update({ is_resolved: true }).eq('id', submission.id);

      toast.success(`Brand "${brandName}" added to Brand Management (inactive). Activate it manually to publish.`);
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Error accepting brand:', error);
      toast.error('Failed to create brand');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefuse = async (submission: ContactSubmission) => {
    setActionLoading(true);
    try {
      await supabase.from('contact_submissions').update({ is_resolved: true }).eq('id', submission.id);
      toast.success('Submission refused and marked as resolved');
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error) {
      toast.error('Failed to update submission');
    } finally {
      setActionLoading(false);
    }
  };

  const getInquiryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'new-brand': 'New Brand',
      'new-shop': 'New Shop',
      'new-submission': 'New Submission',
      'correction': 'Report Issue',
      'partnership': 'Partnership',
      'other': 'Other'
    };
    return labels[type] || type;
  };

  const getInquiryTypeBadgeVariant = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'new-brand': 'default',
      'new-shop': 'secondary',
      'new-submission': 'default',
      'correction': 'destructive',
      'partnership': 'secondary',
      'other': 'outline'
    };
    return variants[type] || 'outline';
  };

  const isActionableSubmission = (type: string) => type === 'new-brand' || type === 'new-shop';

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  const renderDetailContent = (submission: ContactSubmission) => {
    const isStructured = submission.inquiry_type === 'new-brand' || submission.inquiry_type === 'new-shop';

    if (!isStructured) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{submission.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <a href={`mailto:${submission.email}`} className="font-medium text-primary hover:underline">{submission.email}</a>
            </div>
          </div>
          {submission.subject && (
            <div>
              <p className="text-sm text-muted-foreground">Subject</p>
              <p className="font-medium">{submission.subject}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Message</p>
            <div className="bg-muted p-4 rounded-md">
              <p className="whitespace-pre-wrap">{submission.message}</p>
            </div>
          </div>
        </div>
      );
    }

    // Structured submission (brand or shop)
    const fields = parseSubmissionMessage(submission.message);
    const allUrls = extractUrls(submission.message);
    const imageUrls = allUrls.filter(isImageUrl);
    const logoText = fields['Logo'] || '';
    const logoUrls = extractUrls(logoText);
    const photoText = fields['Photos'] || '';
    const photoUrls = extractUrls(photoText);

    // Fields to display nicely
    const displayFields = Object.entries(fields).filter(([key]) => 
      !['Logo', 'Photos', 'Submitted by'].includes(key)
    );

    return (
      <div className="space-y-4">
        {/* Submitter info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Submitted by</p>
            <p className="font-medium text-sm">{fields['Submitted by'] || submission.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Contact</p>
            <a href={`mailto:${submission.email}`} className="text-sm text-primary hover:underline flex items-center gap-1">
              <Mail className="w-3 h-3" />{submission.email}
            </a>
          </div>
        </div>

        {/* Parsed fields */}
        <div className="space-y-3 bg-muted/50 rounded-lg p-4">
          {displayFields.map(([key, value]) => (
            <div key={key}>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{key}</p>
              {value.startsWith('http') ? (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />{value}
                </a>
              ) : (
                <p className="text-sm">{value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Logo preview */}
        {logoUrls.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Logo</p>
            <img src={logoUrls[0]} alt="Logo" className="w-20 h-20 object-contain rounded-md border bg-background" />
          </div>
        )}

        {/* Photo previews */}
        {photoUrls.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Photos ({photoUrls.length})</p>
            <div className="grid grid-cols-3 gap-2">
              {photoUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full aspect-square object-cover rounded-md border hover:opacity-80 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

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
                        <a href={`mailto:${submission.email}`} className="text-primary hover:underline flex items-center gap-1">
                          <Mail className="w-3 h-3" />{submission.email}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{submission.subject || '-'}</TableCell>
                      <TableCell>
                        {submission.is_resolved ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500">Resolved</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedSubmission(submission)}>View</Button>
                          <Button size="sm" variant={submission.is_resolved ? "outline" : "default"} onClick={() => handleToggleResolved(submission.id, submission.is_resolved)}>
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
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>
              {selectedSubmission && isActionableSubmission(selectedSubmission.inquiry_type)
                ? `Review: ${getInquiryTypeLabel(selectedSubmission.inquiry_type)} Submission`
                : 'Contact Submission Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedSubmission && (
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedSubmission.created_at), 'MMMM dd, yyyy HH:mm')}
                  <Badge variant={getInquiryTypeBadgeVariant(selectedSubmission.inquiry_type)} className="ml-2">
                    {getInquiryTypeLabel(selectedSubmission.inquiry_type)}
                  </Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 200px)' }}>
            {selectedSubmission && renderDetailContent(selectedSubmission)}
          </ScrollArea>

          {/* Action buttons - always visible at bottom */}
          {selectedSubmission && (
            <div className="border-t px-6 py-4 flex justify-between items-center bg-background">
              <div>
                Status:{' '}
                {selectedSubmission.is_resolved ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">Resolved</Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Pending</Badge>
                )}
              </div>
              <div className="flex gap-2">
                {!selectedSubmission.is_resolved && isActionableSubmission(selectedSubmission.inquiry_type) ? (
                  <>
                    <Button
                      variant="destructive"
                      disabled={actionLoading}
                      onClick={() => handleRefuse(selectedSubmission)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Refuse
                    </Button>
                    <Button
                      disabled={actionLoading}
                      onClick={() => {
                        if (selectedSubmission.inquiry_type === 'new-shop') {
                          handleAcceptShop(selectedSubmission);
                        } else {
                          handleAcceptBrand(selectedSubmission);
                        }
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Accept & Add (Inactive)
                    </Button>
                  </>
                ) : !selectedSubmission.is_resolved ? (
                  <Button onClick={() => { handleToggleResolved(selectedSubmission.id, false); setSelectedSubmission(null); }}>
                    Mark as Resolved
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => { handleToggleResolved(selectedSubmission.id, true); setSelectedSubmission(null); }}>
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
