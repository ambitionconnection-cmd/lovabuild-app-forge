import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ProUpgradeModal } from "@/components/ProUpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, User, Lock, CreditCard, Shield, Calendar, Mail, Crown, AlertCircle, Bell, History, Upload, Instagram } from "lucide-react";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { RedeemCodeCard } from "@/components/RedeemCodeCard";

const profileSchema = z.object({
  display_name: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(100),
  bio: z.string().max(280).optional().or(z.literal("")),
  instagram_handle: z.string().max(50).optional().or(z.literal("")),
  tiktok_handle: z.string().max(50).optional().or(z.literal("")),
  show_instagram: z.boolean(),
  show_tiktok: z.boolean(),
  show_email: z.boolean(),
});

const passwordSchema = z.object({
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }).max(100),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

interface NotificationPreferences {
  drop_reminders: boolean;
  favorite_brand_drops: boolean;
  new_shop_openings: boolean;
  weekly_digest: boolean;
  promotional_emails: boolean;
  digest_frequency?: 'weekly' | 'bi-weekly' | 'monthly';
}

const Profile = () => {
  const { user, signOut, updatePassword, isPro, checkSubscription } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = React.useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = React.useState(false);
  const [profile, setProfile] = React.useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const [notificationPrefs, setNotificationPrefs] = React.useState<NotificationPreferences>({
    drop_reminders: true,
    favorite_brand_drops: true,
    new_shop_openings: false,
    weekly_digest: true,
    promotional_emails: false,
    digest_frequency: 'weekly',
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: "",
      bio: "",
      instagram_handle: "",
      tiktok_handle: "",
      show_instagram: true,
      show_tiktok: true,
      show_email: false,
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    if (user) {
      loadProfile();
      // Check subscription on page load (e.g. after returning from Stripe checkout)
      const params = new URLSearchParams(window.location.search);
      if (params.get('subscription') === 'success') {
        checkSubscription();
      }
    } else {
      navigate('/auth');
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      toast.error("Failed to load profile");
      return;
    }

    setProfile(data);
    profileForm.reset({
      display_name: data.display_name || "",
      bio: (data as any).bio || "",
      instagram_handle: (data as any).instagram_handle || "",
      tiktok_handle: (data as any).tiktok_handle || "",
      show_instagram: (data as any).show_instagram ?? true,
      show_tiktok: (data as any).show_tiktok ?? true,
      show_email: (data as any).show_email ?? false,
    });
    
    // Load notification preferences
    if (data.notification_preferences && typeof data.notification_preferences === 'object') {
      setNotificationPrefs(data.notification_preferences as unknown as NotificationPreferences);
    }
  };

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        bio: data.bio || null,
        instagram_handle: data.instagram_handle || null,
        tiktok_handle: data.tiktok_handle || null,
        show_instagram: data.show_instagram,
        show_tiktok: data.show_tiktok,
        show_email: data.show_email,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
      loadProfile();
    }

    setIsLoading(false);
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsPasswordLoading(true);

    // Check password against breach database
    try {
      const { data: validationResult, error: validationError } = await supabase.functions.invoke(
        'validate-password-strength',
        {
          body: { password: data.newPassword }
        }
      );

      if (validationError) {
        console.error('Password validation error:', validationError);
        toast.error('Unable to validate password. Please try again.');
        setIsPasswordLoading(false);
        return;
      }

      if (!validationResult.valid) {
        if (validationResult.breached) {
          toast.error('This password has been exposed in a data breach. Please choose a different password.');
        } else {
          toast.error(validationResult.message || 'Password does not meet security requirements');
        }
        setIsPasswordLoading(false);
        return;
      }
    } catch (error) {
      console.error('Password validation error:', error);
      toast.error('Unable to validate password. Please try again.');
      setIsPasswordLoading(false);
      return;
    }

    const { error } = await updatePassword(data.newPassword);

    if (!error) {
      passwordForm.reset();
    }

    setIsPasswordLoading(false);
  };

  const getInitials = () => {
    if (!profile?.display_name) return user?.email?.charAt(0).toUpperCase() || "U";
    return profile.display_name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      toast.success("Avatar updated!");
      loadProfile();
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error("Failed to upload avatar");
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const updateNotificationPreference = async (key: keyof NotificationPreferences, value: boolean | string) => {
    if (!user) return;

    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);

    const { error } = await supabase
      .from("profiles")
      .update({
        notification_preferences: newPrefs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update notification preferences");
      // Revert on error
      setNotificationPrefs(notificationPrefs);
    } else {
      toast.success("Notification preferences updated");
    }
  };

  const isProActive = isPro || (profile?.is_pro && (!profile?.pro_expires_at || new Date(profile.pro_expires_at) > new Date()));

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pt-0 lg:pt-14">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" className="h-10 w-10 touch-manipulation active:scale-95" onClick={() => navigate("/more")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Profile Settings</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            <Button variant="destructive" size="sm" className="touch-manipulation active:scale-95" onClick={signOut}>
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isAvatarUploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-2">
                  <h2 className="text-2xl font-bold">{profile?.display_name || 'User'}</h2>
                  {isProActive && (
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                      <Crown className="w-3 h-3 mr-1" />
                      PRO
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </p>
                {user.created_at && (
                  <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2 mt-1">
                    <Calendar className="w-4 h-4" />
                    Member since {format(new Date(user.created_at), 'MMMM yyyy')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm touch-manipulation">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm touch-manipulation">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm touch-manipulation">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-3 text-xs sm:text-sm touch-manipulation">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Subscription</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your profile details and avatar</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormDescription>
                            This is your public display name on FLYAF
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Tell us about your style..." maxLength={280} className="resize-none h-20" {...field} />
                          </FormControl>
                          <FormDescription>
                            Short description visible on your profile card (max 280 chars)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />
                    <p className="text-sm font-semibold">Social Handles</p>

                    <FormField
                      control={profileForm.control}
                      name="instagram_handle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><Instagram className="w-4 h-4" /> Instagram</FormLabel>
                          <FormControl>
                            <Input placeholder="@yourhandle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="show_instagram"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel className="text-sm text-muted-foreground">Show Instagram on profile card</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="tiktok_handle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><TikTokIcon className="w-4 h-4" /> TikTok</FormLabel>
                          <FormControl>
                            <Input placeholder="@yourhandle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="show_tiktok"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel className="text-sm text-muted-foreground">Show TikTok on profile card</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Separator />
                    <p className="text-sm font-semibold">Privacy</p>

                    <FormField
                      control={profileForm.control}
                      name="show_email"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <div>
                            <FormLabel className="text-sm flex items-center gap-1.5"><Mail className="w-4 h-4" /> Show email on profile card</FormLabel>
                            <p className="text-xs text-muted-foreground mt-0.5">Off by default for privacy</p>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Notifications</CardTitle>
                    <CardDescription>Manage which emails you receive from FLYAF</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/notifications")}>
                    <History className="w-4 h-4 mr-2" />
                    View History
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertTitle>Email Address</AlertTitle>
                  <AlertDescription>
                    Notifications will be sent to {user.email}
                  </AlertDescription>
                </Alert>

                <div className="space-y-6">
                  {/* Drop Reminders */}
                  <div className="flex items-start justify-between space-x-4 py-4 border-b">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="drop-reminders" className="text-base font-semibold cursor-pointer">
                        Drop Reminders
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when drops you've set reminders for are about to go live
                      </p>
                    </div>
                    <Switch
                      id="drop-reminders"
                      checked={notificationPrefs.drop_reminders}
                      onCheckedChange={(checked) => updateNotificationPreference('drop_reminders', checked)}
                    />
                  </div>

                  {/* Favorite Brand Drops */}
                  <div className="flex items-start justify-between space-x-4 py-4 border-b">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="favorite-brands" className="text-base font-semibold cursor-pointer">
                        Favorite Brand Drops
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications when your favorite brands release new drops
                      </p>
                    </div>
                    <Switch
                      id="favorite-brands"
                      checked={notificationPrefs.favorite_brand_drops}
                      onCheckedChange={(checked) => updateNotificationPreference('favorite_brand_drops', checked)}
                    />
                  </div>

                  {/* New Shop Openings */}
                  <div className="flex items-start justify-between space-x-4 py-4 border-b">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="new-shops" className="text-base font-semibold cursor-pointer">
                        New Shop Openings
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get alerts when new shops are added near your favorite locations
                      </p>
                    </div>
                    <Switch
                      id="new-shops"
                      checked={notificationPrefs.new_shop_openings}
                      onCheckedChange={(checked) => updateNotificationPreference('new_shop_openings', checked)}
                    />
                  </div>

                  {/* Weekly Digest */}
                  <div className="space-y-4 py-4 border-b">
                    <div className="flex items-start justify-between space-x-4">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="weekly-digest" className="text-base font-semibold cursor-pointer">
                          Digest Emails
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive periodic summaries of upcoming drops and new brands
                        </p>
                      </div>
                      <Switch
                        id="weekly-digest"
                        checked={notificationPrefs.weekly_digest}
                        onCheckedChange={(checked) => updateNotificationPreference('weekly_digest', checked)}
                      />
                    </div>
                    
                    {notificationPrefs.weekly_digest && (
                      <div className="pl-4 space-y-2">
                        <Label htmlFor="digest-frequency" className="text-sm font-medium">
                          Frequency
                        </Label>
                        <Select
                          value={notificationPrefs.digest_frequency || 'weekly'}
                          onValueChange={(value) => updateNotificationPreference('digest_frequency', value)}
                        >
                          <SelectTrigger id="digest-frequency" className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly (Every Monday)</SelectItem>
                            <SelectItem value="bi-weekly">Bi-weekly (Every 2 weeks)</SelectItem>
                            <SelectItem value="monthly">Monthly (First Monday)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Choose how often you want to receive digest emails
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Promotional Emails */}
                  <div className="flex items-start justify-between space-x-4 py-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="promotional" className="text-base font-semibold cursor-pointer">
                        Promotional Emails
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive exclusive offers, discounts, and special announcements
                      </p>
                    </div>
                    <Switch
                      id="promotional"
                      checked={notificationPrefs.promotional_emails}
                      onCheckedChange={(checked) => updateNotificationPreference('promotional_emails', checked)}
                    />
                  </div>
                </div>

                <Alert className="bg-muted/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Note</AlertTitle>
                  <AlertDescription>
                    You can unsubscribe from all emails at any time. Critical account-related emails will still be sent.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Password & Security</CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Account Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Account Information
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{user.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">User ID</span>
                      <span className="font-mono text-xs">{user.id}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Email Confirmed</span>
                      <Badge variant={user.email_confirmed_at ? "default" : "secondary"}>
                        {user.email_confirmed_at ? "Verified" : "Not Verified"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Change Password */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Change Password
                  </h3>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter new password" {...field} />
                            </FormControl>
                            <FormDescription>
                              Must be at least 8 characters long
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={isPasswordLoading}>
                        {isPasswordLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </form>
                  </Form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Status</CardTitle>
                <CardDescription>Manage your FLYAF Pro subscription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isProActive ? (
                  <>
                    <Alert className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/50">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <AlertTitle className="text-yellow-700 dark:text-yellow-300">
                        {profile?.is_founding_member ? "🏆 Founding Member — FLYAF Pro" : "FLYAF Pro Member"}
                      </AlertTitle>
                      <AlertDescription className="text-yellow-600 dark:text-yellow-400">
                        {profile?.is_founding_member
                          ? "You're one of FLYAF's first 500 members. Pro is on us — thanks for being here from the start."
                          : "You have access to all premium features — unlimited routes, favourites, PDF export & Pro badge"}
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <div className="flex justify-between py-3 border-b">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                          Active
                        </Badge>
                      </div>
                      {profile?.pro_expires_at && (
                        <div className="flex justify-between py-3 border-b">
                          <span className="text-muted-foreground">Expires</span>
                          <span className="font-medium">
                            {format(new Date(profile.pro_expires_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4">
                      <h4 className="font-semibold mb-3">Your Pro Benefits</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c48e19]" />
                          Unlimited saved routes
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c48e19]" />
                          Unlimited favourites
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c48e19]" />
                          Print/PDF route export
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c48e19]" />
                          Pro badge on profile & posts
                        </li>
                      </ul>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase.functions.invoke("customer-portal");
                          if (error) throw error;
                          if (data?.url) window.open(data.url, "_blank");
                        } catch {
                          toast.error("Unable to open subscription management");
                        }
                      }}
                    >
                      Manage Subscription
                    </Button>
                  </>
                ) : (
                  <>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Free Plan</AlertTitle>
                      <AlertDescription>
                        You're on the free plan. Upgrade to FLYAF Pro for the full experience!
                      </AlertDescription>
                    </Alert>

                    <RedeemCodeCard />

                    <Card className="bg-gradient-to-br from-[#c48e19]/10 to-[#c48e19]/5 border-[#c48e19]/20">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-[#c48e19]" />
                            FLYAF Pro
                          </CardTitle>
                          <Badge className="bg-[#c48e19] text-black">From £2.99/mo</Badge>
                        </div>
                        <CardDescription>Unlimited routes, favourites, PDF export & Pro badge</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          className="w-full bg-[#c48e19] hover:bg-[#b07d15] text-black font-bold"
                          onClick={() => setShowUpgradeModal(true)}
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Upgrade to Pro
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <ProUpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </div>
  );
};

export default Profile;
