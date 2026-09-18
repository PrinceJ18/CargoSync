import type { HTMLAttributes } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
}

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium border";
  
  const variants = {
    default: "bg-surface-elevated text-text-secondary border-border",
    success: "bg-emerald/10 text-success border-emerald/20",
    warning: "bg-amber/10 text-warning border-amber/20",
    error: "bg-error/10 text-error border-error/20",
    info: "bg-info/10 text-info border-info/20",
  };

  const classes = `${baseStyles} ${variants[variant]} ${className}`;

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

