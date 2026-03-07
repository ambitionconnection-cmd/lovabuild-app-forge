import { useState, useEffect, useCallback } from "react";
import { X, Instagram, UserPlus, UserCheck, Camera, Download, Mail } from "lucide-react";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserProfileCardProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  onPostClick?: (postId: string) => void;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  show_instagram: boolean;
  show_tiktok: boolean;
  show_email: boolean;
  is_pro: boolean;
  email?: string | null;
}

interface UserPost {
  id: string;
  image_url: string;
  like_count: number;
  created_at: string;
}

const ProfileContent = ({ userId, onClose, onPostClick }: Omit<UserProfileCardProps, "open">) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, postsRes, followCountRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, bio, instagram_handle, tiktok_handle, show_instagram, show_tiktok, show_email, is_pro").eq("id", userId).single(),
        supabase.from("street_spotted_posts").select("id, image_url, created_at").eq("user_id", userId).eq("status", "approved").order("created_at", { ascending: false }).limit(30),
        supabase.from("user_follows").select("id", { count: "exact" }).eq("following_id", userId),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data as unknown as UserProfile);
      }

      // Get like counts for posts
      if (postsRes.data?.length) {
        const postIds = postsRes.data.map(p => p.id);
        const { data: likesData } = await supabase.from("street_spotted_likes").select("post_id").in("post_id", postIds);
        const likeMap = new Map<string, number>();
        (likesData || []).forEach(l => likeMap.set(l.post_id, (likeMap.get(l.post_id) || 0) + 1));
        
        setPosts(postsRes.data.map(p => ({
          ...p,
          like_count: likeMap.get(p.id) || 0,
        })));
      }

      setFollowerCount(followCountRes.count || 0);

      // Check if current user follows this user
      if (user && user.id !== userId) {
        const { data: followData } = await supabase
          .from("user_follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", userId)
          .maybeSingle();
        setIsFollowing(!!followData);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const toggleFollow = async () => {
    if (!user) {
      toast.info("Sign in to follow users");
      return;
    }
    if (user.id === userId) return;

    if (isFollowing) {
      await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      setIsFollowing(false);
      setFollowerCount(c => c - 1);
      toast.success("Unfollowed");
    } else {
      await supabase.from("user_follows").insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
      toast.success("Following! You'll see their new posts.");
    }
  };

  const getInitials = () => {
    if (!profile?.display_name) return "U";
    return profile.display_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[1,2,3].map(i => <Skeleton key={i} className="aspect-square rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!profile) return <div className="p-6 text-center text-muted-foreground">User not found</div>;

  return (
    <div className="max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16 ring-2 ring-border">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-xl font-bold">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold truncate">{profile.display_name || "User"}</h3>
              {profile.is_pro && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-[9px] font-bold">PRO</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{posts.length}</strong> posts</span>
              <span><strong className="text-foreground">{followerCount}</strong> followers</span>
            </div>
            {/* Social handles */}
            <div className="flex items-center gap-3 mt-2">
              {profile.show_instagram && profile.instagram_handle && (
                <a
                  href={`https://instagram.com/${profile.instagram_handle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  @{profile.instagram_handle.replace("@", "")}
                </a>
              )}
              {profile.show_tiktok && profile.tiktok_handle && (
                <a
                  href={`https://tiktok.com/@${profile.tiktok_handle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <TikTokIcon className="w-3.5 h-3.5" />
                  @{profile.tiktok_handle.replace("@", "")}
                </a>
              )}
              {profile.show_email && profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {profile.email}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 text-sm text-muted-foreground">{profile.bio}</p>
        )}

        {/* Follow button */}
        {user && user.id !== userId && (
          <Button
            onClick={toggleFollow}
            variant={isFollowing ? "outline" : "default"}
            size="sm"
            className="w-full mt-4"
          >
            {isFollowing ? (
              <><UserCheck className="w-4 h-4 mr-1.5" /> Following</>
            ) : (
              <><UserPlus className="w-4 h-4 mr-1.5" /> Follow</>
            )}
          </Button>
        )}
      </div>

      {/* Posts grid */}
      {posts.length > 0 ? (
        <div className="border-t border-border">
          <p className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            Posts
          </p>
          <div className="grid grid-cols-3 gap-0.5 px-0.5 pb-0.5">
            {posts.map(post => (
              <button
                key={post.id}
                onClick={() => onPostClick?.(post.id)}
                className="relative aspect-square overflow-hidden group"
              >
                <img src={post.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-1 text-white text-xs font-medium">
                    <Flame className="w-3.5 h-3.5 fill-white" />
                    {post.like_count}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t border-border p-8 text-center text-sm text-muted-foreground">
          No posts yet
        </div>
      )}
    </div>
  );
};

export const UserProfileCard = ({ userId, open, onClose, onPostClick }: UserProfileCardProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <ProfileContent userId={userId} onClose={onClose} onPostClick={onPostClick} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <ProfileContent userId={userId} onClose={onClose} onPostClick={onPostClick} />
      </DialogContent>
    </Dialog>
  );
};
