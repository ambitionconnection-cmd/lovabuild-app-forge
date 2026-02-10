import { Map, Route, Globe, Flame, MoreHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { icon: Map, label: "Map", path: "/" },
  { icon: Route, label: "Route", path: "/route" },
  { icon: Globe, label: "Index", path: "/global-index" },
  { icon: Flame, label: "Drops", path: "/drops" },
  { icon: MoreHorizontal, label: "More", path: "/more" },
];

export const DesktopTopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getIsActive = (tabPath: string) => {
    if (tabPath === "/") {
      return location.pathname === "/" || location.pathname === "/directions";
    }
    return location.pathname.startsWith(tabPath);
  };

  return (
    <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-12 bg-black/95 backdrop-blur-lg border-b border-white/10 items-center px-6 gap-1">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-6">
        <div className="w-6 h-6 rounded border border-white/20 flex items-center justify-center">
          <span className="text-white font-bold text-xs">H</span>
        </div>
        <span className="text-white font-bold text-sm tracking-wider">HEARDROP</span>
      </div>

      {/* Nav tabs */}
      {tabs.map((tab) => {
        const isActive = getIsActive(tab.path);
        const Icon = tab.icon;

        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={cn(
              "flex items-center gap-2 px-4 h-full text-sm font-medium transition-all border-b-2",
              isActive
                ? "text-white border-white"
                : "text-white/40 border-transparent hover:text-white/70"
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};