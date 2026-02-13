import { Map, Route, Globe, Flame, MoreHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import haptic from "@/lib/haptics";

interface TabItem {
  icon: typeof Map;
  label: string;
  path: string;
  activeColor: string;
  activeTextColor: string;
}

const tabs: TabItem[] = [
  { icon: Map, label: "Map", path: "/", activeColor: "text-[#AD3A49]", activeTextColor: "text-[#AD3A49]" },
  { icon: Route, label: "Route", path: "/route", activeColor: "text-[#C4956A]", activeTextColor: "text-[#C4956A]" },
  { icon: Globe, label: "Index", path: "/global-index", activeColor: "text-[#C3C9C9]", activeTextColor: "text-[#C3C9C9]" },
  { icon: Flame, label: "Drops", path: "/drops", activeColor: "text-[#8B6DAF]", activeTextColor: "text-[#8B6DAF]" },
  { icon: MoreHorizontal, label: "More", path: "/more", activeColor: "text-[#7D8184]", activeTextColor: "text-[#7D8184]" },
];

export const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenRoutes = ["/admin", "/auth", "/analytics", "/notifications"];
  if (hiddenRoutes.some(route => location.pathname.startsWith(route))) {
    return null;
  }

  const getIsActive = (tabPath: string) => {
    if (tabPath === "/") {
      return location.pathname === "/" || location.pathname === "/directions";
    }
    return location.pathname.startsWith(tabPath);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-t border-white/10 safe-area-bottom lg:hidden">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const isActive = getIsActive(tab.path);
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => {
                haptic.selection();
                if (tab.path === '/') {
                  window.dispatchEvent(new CustomEvent('reopenShopsSheet'));
                  if (location.pathname !== '/' || location.search) {
                    navigate('/');
                  }
                } else if (tab.path === '/route') {
                  window.dispatchEvent(new CustomEvent('reopenRouteSheet'));
                  navigate(tab.path);
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
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};