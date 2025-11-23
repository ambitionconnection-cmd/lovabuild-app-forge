import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Bell, BellRing, Check, Trash2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: any;
}

const NotificationHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      navigate('/auth');
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("notification_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error('Error loading notifications:', error);
      toast.error("Failed to load notifications");
    } else {
      setNotifications(data || []);
    }

    setIsLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("notification_history")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to mark as read");
    } else {
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("notification_history")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      toast.error("Failed to mark all as read");
    } else {
      toast.success("All notifications marked as read");
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "drop_reminder":
        return <BellRing className="w-5 h-5 text-primary" />;
      case "favorite_brand":
        return <Bell className="w-5 h-5 text-primary" />;
      case "new_shop":
        return <Bell className="w-5 h-5 text-primary" />;
      default:
        return <Mail className="w-5 h-5 text-primary" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Notification History</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Bell className="w-16 h-16 text-muted-foreground/50" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">No notifications yet</h3>
                  <p className="text-muted-foreground">
                    When you receive notifications, they'll appear here
                  </p>
                </div>
                <Button onClick={() => navigate("/profile")} variant="outline">
                  Manage Notification Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`transition-all ${!notification.is_read ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{notification.title}</h3>
                            {!notification.is_read && (
                              <Badge variant="secondary" className="text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="flex-shrink-0"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Mark Read
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationHistory;
