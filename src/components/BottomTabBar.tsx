import { Home, MapPin, Zap, Globe, Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface TabItem {
  icon: typeof Home;
  label: string;
  path: string;
}

const tabs: TabItem[] = [
  { icon: Home, label: "nav.home", path: "/" },
  { icon: MapPin, label: "nav.directions", path: "/directions" },
  { icon: Zap, label: "nav.drops", path: "/drops" },
  { icon: Globe, label: "nav.global", path: "/global-index" },
  { icon: Heart, label: "nav.myHeardrop", path: "/my-heardrop" },
];

export const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Hide on certain routes like admin, profile, etc.
  const hiddenRoutes = ["/admin", "/profile", "/auth", "/analytics", "/notifications", "/contact", "/shop-map"];
  if (hiddenRoutes.some(route => location.pathname.startsWith(route))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                "active:scale-95 touch-manipulation",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-all",
                  isActive && "stroke-[2.5px]"
                )} 
              />
              <span className={cn(
                "text-[10px] font-medium truncate max-w-[60px]",
                isActive && "font-semibold"
              )}>
                {t(tab.label)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
