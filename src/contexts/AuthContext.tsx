import * as React from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  resendVerificationEmail: (email: string) => Promise<{ error: any }>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split("@")[0],
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success("Account created! Please check your email to confirm.");
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    // Check if account is locked
    const { data: attemptData } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (attemptData?.locked_until && new Date(attemptData.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(attemptData.locked_until).getTime() - Date.now()) / 60000);
      toast.error(`Account is locked. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`);
      return { error: { message: 'Account locked' } };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Record failed attempt
      const currentAttempts = (attemptData?.attempts || 0) + 1;
      const shouldLock = currentAttempts >= 5;
      
      if (attemptData) {
        await supabase
          .from('login_attempts')
          .update({
            attempts: currentAttempts,
            locked_until: shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
            last_attempt: new Date().toISOString()
          })
          .eq('email', email.toLowerCase());
      } else {
        await supabase
          .from('login_attempts')
          .insert({
            email: email.toLowerCase(),
            attempts: currentAttempts,
            locked_until: shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
          });
      }

      if (shouldLock) {
        toast.error('Too many failed attempts. Account locked for 15 minutes.');
      } else {
        toast.error(`Invalid credentials. ${5 - currentAttempts} attempt${5 - currentAttempts !== 1 ? 's' : ''} remaining.`);
      }
      return { error };
    }

    // Reset attempts on successful login
    if (attemptData) {
      await supabase
        .from('login_attempts')
        .delete()
        .eq('email', email.toLowerCase());
    }

    toast.success("Welcome back!");
    navigate("/");
    return { error: null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    
    if (error) {
      toast.error(error.message);
      return { error };
    }
    
    toast.success("Password reset link sent to your email");
    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      toast.error(error.message);
      return { error };
    }
    
    toast.success("Password updated successfully");
    return { error: null };
  };

  const resendVerificationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      }
    });
    
    if (error) {
      toast.error(error.message);
      return { error };
    }
    
    toast.success("Verification email sent! Please check your inbox.");
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signUp, 
      signIn, 
      signInWithGoogle, 
      signOut,
      resetPassword,
      updatePassword,
      resendVerificationEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
