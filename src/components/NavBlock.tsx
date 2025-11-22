import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavBlockProps {
  title: string;
  icon: LucideIcon;
  to: string;
  variant: "directions" | "global" | "drops" | "heardrop";
  badge?: number;
}

const variantStyles = {
  directions: "bg-directions text-directions-foreground hover:brightness-110",
  global: "bg-global text-global-foreground hover:brightness-110",
  drops: "bg-drops text-drops-foreground hover:brightness-110",
  heardrop: "bg-heardrop text-heardrop-foreground hover:brightness-110",
};

export const NavBlock = ({ title, icon: Icon, to, variant, badge }: NavBlockProps) => {
  return (
    <Link
      to={to}
      className={cn(
        "relative w-full rounded-xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl",
        "flex flex-col items-center justify-center gap-4",
        "min-h-[140px]",
        variantStyles[variant]
      )}
    >
      {badge !== undefined && badge > 0 && (
        <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg">
          {badge}
        </div>
      )}
      <Icon className="w-12 h-12" strokeWidth={2.5} />
      <h2 className="text-2xl font-bold uppercase tracking-wider">{title}</h2>
    </Link>
  );
};
