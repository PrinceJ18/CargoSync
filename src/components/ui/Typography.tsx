import type { HTMLAttributes } from "react";

export function H1({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={`text-3xl font-bold tracking-tight text-text-primary ${className}`} {...props} />;
}

export function H2({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-2xl font-semibold tracking-tight text-text-primary ${className}`} {...props} />;
}

export function H3({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-xl font-semibold tracking-tight text-text-primary ${className}`} {...props} />;
}

export function Text({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-text-secondary leading-relaxed ${className}`} {...props} />;
}

export function TechnicalText({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`font-mono text-xs text-text-primary ${className}`} {...props} />;
}

