import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(128, { message: "Password must be less than 128 characters" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character" }),
  confirmPassword: z.string(),
  displayName: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(100),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
});

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(128, { message: "Password must be less than 128 characters" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormValues = z.infer<typeof signInSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const Auth = () => {
  const { user, signIn, signUp, signInWithGoogle, resetPassword, updatePassword, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = React.useState(false);
  const [verificationEmail, setVerificationEmail] = React.useState("");
  
  const searchParams = new URLSearchParams(location.search);
  const mode = searchParams.get('mode');
  const isResetMode = mode === 'reset';

  React.useEffect(() => {
    if (user && !isResetMode) {
      navigate("/");
    }
  }, [user, navigate, isResetMode]);

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      displayName: "",
    },
  });
  
  const signUpPassword = signUpForm.watch("password");

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  
  const resetPasswordValue = resetPasswordForm.watch("password");

  const onSignIn = async (data: SignInFormValues) => {
    setIsLoading(true);
    await signIn(data.email, data.password);
    setIsLoading(false);
  };

  const onSignUp = async (data: SignUpFormValues) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.displayName);
    setIsLoading(false);
    
    if (!error) {
      setVerificationEmail(data.email);
      setShowVerificationMessage(true);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signInWithGoogle();
    setIsLoading(false);
  };

  const onForgotPassword = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    await resetPassword(data.email);
    setIsLoading(false);
    setShowForgotPassword(false);
  };

  const onResetPassword = async (data: ResetPasswordFormValues) => {
    setIsLoading(true);
    const { error } = await updatePassword(data.password);
    setIsLoading(false);
    if (!error) {
      navigate("/");
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    await resendVerificationEmail(verificationEmail);
    setIsLoading(false);
  };

  if (isResetMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-directions via-drops to-heardrop" />
            <h1 className="text-3xl font-bold tracking-tight">HEARDROP</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Enter your new password</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...resetPasswordForm}>
                <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-4">
                  <FormField
                    control={resetPasswordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input placeholder="••••••••" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                        <PasswordStrengthIndicator password={resetPasswordValue} />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={resetPasswordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input placeholder="••••••••" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showVerificationMessage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-directions via-drops to-heardrop" />
            <h1 className="text-3xl font-bold tracking-tight">HEARDROP</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Check Your Email</CardTitle>
              <CardDescription>We've sent a verification link to {verificationEmail}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Please check your email and click the verification link to activate your account.</p>
                <p>Didn't receive the email? Check your spam folder or request a new one.</p>
              </div>
              <Button 
                type="button" 
                className="w-full" 
                onClick={handleResendVerification}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Resend Verification Email"}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full" 
                onClick={() => {
                  setShowVerificationMessage(false);
                  setVerificationEmail("");
                }}
              >
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-directions via-drops to-heardrop" />
            <h1 className="text-3xl font-bold tracking-tight">HEARDROP</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>Enter your email to receive a reset link</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
                  <FormField
                    control={forgotPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Back to Sign In
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-directions via-drops to-heardrop" />
          <h1 className="text-3xl font-bold tracking-tight">HEARDROP</h1>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Sign in to your HEARDROP account</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                    <FormField
                      control={signInForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input placeholder="••••••••" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-sm"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Join the HEARDROP community</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                    <FormField
                      control={signUpForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input placeholder="••••••••" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                          <PasswordStrengthIndicator password={signUpPassword} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input placeholder="••••••••" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Sign Up"}
                    </Button>
                  </form>
                </Form>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
