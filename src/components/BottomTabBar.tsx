import { Map, Route, Globe, Flame, MoreHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import haptic from "@/lib/haptics";

interface TabItem {
  icon: typeof Map;
  label: string;
  path: string;
}

const tabs: TabItem[] = [
  { icon: Map, label: "Map", path: "/" },
  { icon: Route, label: "Route", path: "/route" },
  { icon: Globe, label: "Index", path: "/global-index" },
  { icon: Flame, label: "Drops", path: "/drops" },
  { icon: MoreHorizontal, label: "More", path: "/more" },
];

export const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide on admin, auth, and detail pages
  const hiddenRoutes = ["/admin", "/auth", "/analytics", "/notifications"];
  if (hiddenRoutes.some(route => location.pathname.startsWith(route))) {
    return null;
  }

  // Determine active tab - "/" and "/directions" both highlight Map
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
                navigate(tab.path);
              }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all",
                "active:scale-90 active:opacity-70 touch-manipulation select-none",
                isActive
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
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