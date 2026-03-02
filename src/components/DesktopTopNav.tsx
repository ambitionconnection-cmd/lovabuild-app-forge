import { useState, useEffect } from "react";
import { Map, Route, Globe, Flame, MoreHorizontal } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface TabItem {
  icon: typeof Map;
  key: string;
  path: string;
  activeColor: string;
  borderColor: string;
}

const tabDefs = [
  { icon: Map, key: "nearby", path: "/", activeColor: "text-[#AD3A49]", borderColor: "border-[#AD3A49]" },
  { icon: Route, key: "route", path: "/route", activeColor: "text-[#C4956A]", borderColor: "border-[#C4956A]" },
  { icon: Globe, key: "index", path: "/global-index", activeColor: "text-[#C3C9C9]", borderColor: "border-[#C3C9C9]" },
  { icon: Flame, key: "hot", path: "/feed", activeColor: "text-[#8B6DAF]", borderColor: "border-[#8B6DAF]" },
  { icon: MoreHorizontal, key: "more", path: "/more", activeColor: "text-[#7D8184]", borderColor: "border-[#7D8184]" },
];

export const DesktopTopNav = () => {
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
    <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-12 bg-black/95 backdrop-blur-lg border-b border-white/10 items-center px-6">
      {/* Logo - left */}
      <div className="flex items-center gap-2 mr-8">
        <div className="w-6 h-6 rounded border border-[#AD3A49]/50 flex items-center justify-center">
          <span className="text-[#AD3A49] font-bold text-xs">H</span>
        </div>
        <span className="text-white font-bold text-sm tracking-wider">HEARDROP</span>
      </div>

      {/* Nav tabs - centered */}
      <div className="flex-1 flex items-center justify-center gap-1">
        {tabDefs.map((tab) => {
          const isActive = getIsActive(tab.path);
          const Icon = tab.icon;
          const label = t(`nav.${tab.key}`);

          return (
            <button
              key={tab.path}
              onClick={() => {
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
                "flex items-center gap-2 px-5 h-12 text-sm font-medium transition-all border-b-2",
                isActive
                  ? `${tab.activeColor} ${tab.borderColor}`
                  : "text-white/30 border-transparent hover:text-white/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Spacer to balance the logo on the left */}
      <div className="w-[120px]" />
    </nav>
  );
};