import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium c-btn-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-control";
  
  const variants = {
    primary: "bg-coral text-ivory hover:bg-coral-deep",
    secondary: "bg-navy text-ivory hover:bg-charcoal",
    outline: "border border-border text-text-primary hover:bg-surface-elevated",
    ghost: "text-text-primary hover:bg-surface-elevated",
    destructive: "bg-error text-ivory hover:bg-red-700",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-6 text-base",
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

