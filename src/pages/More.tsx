import { Heart, User, Mail, Info, Bell, Shield, ChevronRight, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useTranslation } from "react-i18next";

interface MenuItem {
  icon: typeof Heart;
  label: string;
  description: string;
  path: string;
  requiresAuth?: boolean;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  {
    icon: Heart,
    label: "My HEARDROP",
    description: "Favourites, saved shops & brands",
    path: "/my-heardrop",
    requiresAuth: true,
  },
  {
    icon: User,
    label: "Profile",
    description: "Account settings & preferences",
    path: "/profile",
    requiresAuth: true,
  },
  {
    icon: Bell,
    label: "Notifications",
    description: "Drop alerts & reminders",
    path: "/notifications",
    requiresAuth: true,
  },
  {
    icon: Mail,
    label: "Contact",
    description: "Get in touch, submit a brand",
    path: "/contact",
  },
  {
    icon: Info,
    label: "About HEARDROP",
    description: "Our story & mission",
    path: "/about",
  },
  {
    icon: Shield,
    label: "Admin Dashboard",
    description: "Manage content & submissions",
    path: "/admin",
    adminOnly: true,
  },
];

const More = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { i18n } = useTranslation();

  const handleItemClick = (item: MenuItem) => {
    if (item.requiresAuth && !user) {
      toast.info('Sign in required', {
        description: `Sign in to access ${item.label}`,
        action: {
          label: 'Sign In',
          onClick: () => navigate('/auth'),
        },
      });
      return;
    }
    navigate(item.path);
  };

  const visibleItems = menuItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="flex-shrink-0 px-5 pt-5 pb-4 lg:pt-16 lg:px-12">
        <h1 className="text-2xl lg:text-4xl font-bold text-white tracking-wider uppercase">More</h1>
        <p className="text-sm lg:text-base text-white/40 mt-1">Settings, favourites & more</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-12 pb-20">
        <div className="space-y-1 lg:max-w-2xl">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const needsLogin = item.requiresAuth && !user;

            return (
              <button
                key={item.path}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm lg:text-base">{item.label}</p>
                  <p className="text-white/40 text-xs lg:text-sm mt-0.5">{item.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {needsLogin && (
                    <span className="text-[10px] text-white/30 border border-white/10 px-2 py-0.5 rounded-full">
                      Login
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Language Selector */}
        <div className="mt-6 pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3 px-1">
            <Globe className="w-4 h-4 text-[#C4956A]" />
            <span className="text-sm font-medium text-white/70">Language</span>
          </div>
          <div className="flex flex-wrap gap-2 px-1">
            {[
              { code: 'en', label: 'English', flag: '🇬🇧' },
              { code: 'fr', label: 'Français', flag: '🇫🇷' },
              { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
              { code: 'ja', label: '日本語', flag: '🇯🇵' },
              { code: 'ko', label: '한국어', flag: '🇰🇷' },
              { code: 'th', label: 'ไทย', flag: '🇹🇭' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => { i18n.changeLanguage(lang.code); toast.success(`Language changed to ${lang.label}`); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  i18n.language === lang.code || (lang.code === 'en' && !['fr','zh-CN','ja','ko','th'].includes(i18n.language))
                    ? 'bg-[#AD3A49] text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-white/5 text-center">
          <p className="text-white/20 text-xs">HEARDROP v1.0</p>
          <p className="text-white/15 text-[10px] mt-1">Never miss a drop again.</p>
        </div>
      </div>
    </div>
  );
};

export default More;