import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowBack(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background lg:pt-14">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-[#AD3A49] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading...</p>
          {showBack && (
            <button
              onClick={() => navigate('/more')}
              className="mt-4 text-sm text-[#C4956A] hover:text-[#C4956A]/80 transition-colors"
            >
              ← Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};