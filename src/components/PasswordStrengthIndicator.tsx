import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const requirements: Requirement[] = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
    { label: "One special character", met: /[^a-zA-Z0-9]/.test(password) },
  ];

  const metCount = requirements.filter(req => req.met).length;
  const strength = metCount === 0 ? 0 : metCount <= 2 ? 25 : metCount === 3 ? 50 : metCount === 4 ? 75 : 100;
  
  const getStrengthLabel = () => {
    if (metCount === 0) return "";
    if (metCount <= 2) return "Weak";
    if (metCount === 3) return "Fair";
    if (metCount === 4) return "Good";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (metCount <= 2) return "bg-destructive";
    if (metCount === 3) return "bg-yellow-500";
    if (metCount === 4) return "bg-blue-500";
    return "bg-green-500";
  };

  if (!password) return null;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Password strength:</span>
        <span className={cn(
          "font-medium",
          metCount <= 2 && "text-destructive",
          metCount === 3 && "text-yellow-600 dark:text-yellow-500",
          metCount === 4 && "text-blue-600 dark:text-blue-500",
          metCount === 5 && "text-green-600 dark:text-green-500"
        )}>
          {getStrengthLabel()}
        </span>
      </div>
      
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", getStrengthColor())}
          style={{ width: `${strength}%` }}
        />
      </div>

      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li key={index} className="flex items-center gap-2">
            {req.met ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className={cn(
              "text-xs",
              req.met ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
            )}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
