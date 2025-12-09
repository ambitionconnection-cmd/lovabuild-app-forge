import { TrendingUp } from "lucide-react";

interface BrandLogoProps {
  brand: {
    name: string;
    logo_url: string | null;
    category?: string | null;
  };
  className?: string;
}

export const BrandLogo = ({ brand, className = "max-w-full max-h-full object-contain" }: BrandLogoProps) => {
  if (brand.logo_url) {
    return (
      <img 
        src={brand.logo_url} 
        alt={brand.name} 
        className={className}
      />
    );
  }

  // Fallback: Display formatted brand name
  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-foreground/5 to-foreground/10">
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground uppercase tracking-tight line-clamp-2">
          {brand.name}
        </div>
        {brand.category && (
          <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
            {brand.category}
          </div>
        )}
      </div>
    </div>
  );
};
