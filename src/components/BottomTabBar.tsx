import { useState, useEffect } from "react";
import { Map, Route, Globe, Flame, MoreHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import haptic from "@/lib/haptics";
import { useTranslation } from "react-i18next";

interface TabItem {
  icon: typeof Map;
  key: string;
  path: string;
  activeColor: string;
  activeTextColor: string;
}

const tabDefs = [
  { icon: Map, key: "nearby", path: "/", activeColor: "text-[#AD3A49]", activeTextColor: "text-[#AD3A49]" },
  { icon: Route, key: "route", path: "/route", activeColor: "text-[#C4956A]", activeTextColor: "text-[#C4956A]" },
  { icon: Globe, key: "index", path: "/global-index", activeColor: "text-[#C3C9C9]", activeTextColor: "text-[#C3C9C9]" },
  { icon: Flame, key: "drops", path: "/drops", activeColor: "text-[#8B6DAF]", activeTextColor: "text-[#8B6DAF]" },
  { icon: MoreHorizontal, key: "more", path: "/more", activeColor: "text-[#7D8184]", activeTextColor: "text-[#7D8184]" },
];

export const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isRouteActive, setIsRouteActive] = useState(false);

  useEffect(() => {
    const handleRouteMode = () => setIsRouteActive(true);
    const handleMapMode = () => setIsRouteActive(false);
    window.addEventListener('switchToRouteMode', handleRouteMode);
    window.addEventListener('reopenShopsSheet', handleMapMode);
    return () => {
      window.removeEventListener('switchToRouteMode', handleRouteMode);
      window.removeEventListener('reopenShopsSheet', handleMapMode);
    };
  }, []);

  const hiddenRoutes = ["/admin", "/auth", "/analytics", "/notifications"];
  if (hiddenRoutes.some(route => location.pathname.startsWith(route))) {
    return null;
  }

  const getIsActive = (tabPath: string) => {
    if (tabPath === '/route') {
      return isRouteActive && location.pathname === '/';
    }
    if (tabPath === '/') {
      return (location.pathname === '/' || location.pathname === '/directions') && !isRouteActive;
    }
    return location.pathname.startsWith(tabPath);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-t border-white/10 safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-1">
        {tabDefs.map((tab) => {
          const isActive = getIsActive(tab.path);
          const Icon = tab.icon;
          const label = t(`nav.${tab.key}`);

          return (
            <button
              key={tab.path}
              onClick={() => {
                haptic.selection();
                if (tab.path === '/') {
                  window.dispatchEvent(new CustomEvent('reopenShopsSheet'));
                  if (location.pathname !== '/') {
                    navigate('/');
                  }
                } else if (tab.path === '/route') {
                  window.dispatchEvent(new CustomEvent('switchToRouteMode'));
                  window.dispatchEvent(new CustomEvent('reopenRouteSheet'));
                  if (location.pathname !== '/') {
                    navigate('/');
                  }
                } else {
                  navigate(tab.path);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all",
                "active:scale-90 active:opacity-70 touch-manipulation select-none",
                isActive
                  ? tab.activeColor
                  : "text-white/30 hover:text-white/50"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all",
                  isActive && "stroke-[2.5px]"
                )}
              />
              <span className={cn(
                "text-[10px] tracking-wide",
                isActive ? "font-bold" : "font-medium"
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};