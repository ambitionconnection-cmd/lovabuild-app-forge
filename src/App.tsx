import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BottomTabBar } from "@/components/BottomTabBar";
import { DesktopTopNav } from "@/components/DesktopTopNav";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Directions from "./pages/Directions";
import GlobalIndex from "./pages/GlobalIndex";
import BrandDetail from "./pages/BrandDetail";
import ShopMap from "./pages/ShopMap";
import Drops from "./pages/Drops";
import MyHeardrop from "./pages/MyHeardrop";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import NotificationHistory from "./pages/NotificationHistory";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import More from "./pages/More";
import About from "./pages/About";
import RoutePage from "./pages/RoutePage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Auth page - always public */}
              <Route path="/auth" element={<Auth />} />

              {/* PUBLIC PAGES - No login required */}
              <Route path="/" element={<Directions />} />
              <Route path="/directions" element={<Directions />} />
              <Route path="/global-index" element={<GlobalIndex />} />
              <Route path="/brand/:slug" element={<BrandDetail />} />
              <Route path="/shop-map" element={<ShopMap />} />
              <Route path="/drops" element={<Drops />} />


              {/* PROTECTED PAGES - Login required */}
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/my-heardrop" element={<ProtectedRoute><MyHeardrop /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationHistory /></ProtectedRoute>} />
              <Route path="/contact" element={<Contact />} />

              {/* Legacy route - redirect old home to map */}
              <Route path="/index" element={<Directions />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="/route" element={<RoutePage />} />
              <Route path="/more" element={<More />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
             </Routes>
             <DesktopTopNav />
             <BottomTabBar />
            
            <Toaster />
            <Sonner />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;