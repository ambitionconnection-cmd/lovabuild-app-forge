import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Save, Loader2 } from "lucide-react";

interface Preferences {
  email: string;
  notify_contact_messages: boolean;
  notify_pending_posts: boolean;
  notify_brand_requests: boolean;
  notify_new_signups: boolean;
  is_active: boolean;
}

export function AdminNotificationPreferences() {
  const [prefs, setPrefs] = useState<Preferences>({
    email: "",
    notify_contact_messages: true,
    notify_pending_posts: true,
    notify_brand_requests: true,
    notify_new_signups: false,
    is_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("admin_notification_preferences")
        .select("*")
        .eq("admin_id", user.id)
        .maybeSingle();

      if (data) {
        setPrefs({
          email: data.email,
          notify_contact_messages: data.notify_contact_messages,
          notify_pending_posts: data.notify_pending_posts,
          notify_brand_requests: data.notify_brand_requests,
          notify_new_signups: data.notify_new_signups,
          is_active: data.is_active,
        });
        setExists(true);
      } else {
        // Pre-fill with user email
        setPrefs((p) => ({ ...p, email: user.email || "" }));
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!prefs.email) {
      toast.error("Please enter an email address");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (exists) {
        const { error } = await supabase
          .from("admin_notification_preferences")
          .update({
            email: prefs.email,
            notify_contact_messages: prefs.notify_contact_messages,
            notify_pending_posts: prefs.notify_pending_posts,
            notify_brand_requests: prefs.notify_brand_requests,
            notify_new_signups: prefs.notify_new_signups,
            is_active: prefs.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("admin_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("admin_notification_preferences")
          .insert({
            admin_id: user.id,
            email: prefs.email,
            notify_contact_messages: prefs.notify_contact_messages,
            notify_pending_posts: prefs.notify_pending_posts,
            notify_brand_requests: prefs.notify_brand_requests,
            notify_new_signups: prefs.notify_new_signups,
            is_active: prefs.is_active,
          });
        if (error) throw error;
        setExists(true);
      }
      toast.success("Notification preferences saved!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const toggleItems = [
    { key: "notify_contact_messages" as const, label: "New contact messages", desc: "When someone submits the Contact Us form" },
    { key: "notify_pending_posts" as const, label: "Pending HOT posts", desc: "When a new post needs moderation approval" },
    { key: "notify_brand_requests" as const, label: "Brand requests", desc: "When users request new brands to be added" },
    { key: "notify_new_signups" as const, label: "New user signups", desc: "When a new user registers on the platform" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose which events trigger an email notification to you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="notif-email">Notification email</Label>
          <Input
            id="notif-email"
            type="email"
            placeholder="admin@example.com"
            value={prefs.email}
            onChange={(e) => setPrefs((p) => ({ ...p, email: e.target.value }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Enable notifications</Label>
            <p className="text-xs text-muted-foreground">Master toggle for all email alerts</p>
          </div>
          <Switch
            checked={prefs.is_active}
            onCheckedChange={(v) => setPrefs((p) => ({ ...p, is_active: v }))}
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          {toggleItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <Label>{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={prefs[item.key]}
                disabled={!prefs.is_active}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, [item.key]: v }))}
              />
            </div>
          ))}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}
