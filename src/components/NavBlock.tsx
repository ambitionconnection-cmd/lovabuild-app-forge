import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavBlockProps {
  title: string;
  icon: LucideIcon;
  to: string;
  variant: "directions" | "global" | "drops" | "heardrop";
  badge?: number;
  subtitle?: string;
}

const variantStyles = {
  directions: "bg-directions/50 text-directions-foreground border-directions active:bg-directions/75 hover:bg-directions/60",
  global: "bg-global/50 text-global-foreground border-global active:bg-global/75 hover:bg-global/60",
  drops: "bg-drops/50 text-drops-foreground border-drops active:bg-drops/75 hover:bg-drops/60",
  heardrop: "bg-heardrop/50 text-heardrop-foreground border-heardrop active:bg-heardrop/75 hover:bg-heardrop/60",
};

const subtitles = {
  directions: "Find stores near you",
  global: "Browse all brands",
  drops: "Exclusive releases",
  heardrop: "Your favorites",
};

export const NavBlock = ({ title, icon: Icon, to, variant, badge, subtitle }: NavBlockProps) => {
  return (
    <Link
      to={to}
      className={cn(
        "relative w-full rounded-2xl p-6 transition-all duration-300",
        "flex items-center gap-4 md:flex-col md:justify-center md:gap-3",
        "min-h-[80px] md:min-h-[140px]",
        "border-4 shadow-xl hover:shadow-2xl hover:scale-[1.02]",
        "glass-effect",
        variantStyles[variant]
      )}
    >
      {badge !== undefined && badge > 0 && (
        <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg z-10">
          {badge}
        </div>
      )}
      
      <Icon className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0" strokeWidth={2.5} />
      
      <div className="flex-1 md:text-center">
        <h2 className="text-xl md:text-2xl font-bold uppercase tracking-wider mb-0.5 md:mb-1">
          {title}
        </h2>
        <p className="text-xs md:text-sm opacity-90 font-medium">
          {subtitle || subtitles[variant]}
        </p>
      </div>
    </Link>
  );
};
