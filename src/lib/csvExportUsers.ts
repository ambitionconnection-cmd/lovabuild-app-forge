import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface UserExportRow {
  display_name: string;
  email: string;
  bio: string;
  instagram_handle: string;
  tiktok_handle: string;
  is_pro: boolean;
  is_founding_member: boolean;
  show_instagram: boolean;
  show_tiktok: boolean;
  show_email: boolean;
  created_at: string;
  post_count: number;
  follower_count: number;
  following_count: number;
}

const escapeCSV = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

export const exportUsersCSV = async (): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;
    if (!profiles?.length) return { success: true, count: 0 };

    const userIds = profiles.map(p => p.id);

    // Fetch post counts, follower counts, following counts in parallel
    const [postsRes, followersRes, followingRes] = await Promise.all([
      supabase.from('street_spotted_posts').select('user_id').in('user_id', userIds),
      supabase.from('user_follows').select('following_id').in('following_id', userIds),
      supabase.from('user_follows').select('follower_id').in('follower_id', userIds),
    ]);

    const postCounts = new Map<string, number>();
    (postsRes.data || []).forEach(p => postCounts.set(p.user_id, (postCounts.get(p.user_id) || 0) + 1));

    const followerCounts = new Map<string, number>();
    (followersRes.data || []).forEach(f => followerCounts.set(f.following_id, (followerCounts.get(f.following_id) || 0) + 1));

    const followingCounts = new Map<string, number>();
    (followingRes.data || []).forEach(f => followingCounts.set(f.follower_id, (followingCounts.get(f.follower_id) || 0) + 1));

    const headers = [
      'Display Name', 'Bio', 'Instagram', 'TikTok',
      'Show Instagram', 'Show TikTok', 'Show Email',
      'Pro', 'Founding Member', 'Posts', 'Followers', 'Following', 'Joined'
    ];

    const rows = profiles.map(p => [
      escapeCSV(p.display_name || ''),
      escapeCSV((p as any).bio || ''),
      escapeCSV((p as any).instagram_handle || ''),
      escapeCSV((p as any).tiktok_handle || ''),
      (p as any).show_instagram ? 'Yes' : 'No',
      (p as any).show_tiktok ? 'Yes' : 'No',
      (p as any).show_email ? 'Yes' : 'No',
      p.is_pro ? 'Yes' : 'No',
      p.is_founding_member ? 'Yes' : 'No',
      postCounts.get(p.id) || 0,
      followerCounts.get(p.id) || 0,
      followingCounts.get(p.id) || 0,
      p.created_at ? format(new Date(p.created_at), 'yyyy-MM-dd') : '',
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { success: true, count: profiles.length };
  } catch (error) {
    console.error('Error exporting users:', error);
    return { success: false, count: 0, error: String(error) };
  }
};
