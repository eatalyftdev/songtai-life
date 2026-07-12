import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "glass" | "highlight";
  padding?: "none" | "sm" | "md" | "lg";
  children?: ReactNode;
  className?: string;
}

export function Card({
  variant = "default",
  padding = "md",
  children,
  className = "",
  ...props
}: CardProps) {
  const base = "rounded-2xl text-left transition-all";

  const variants = {
    default: "bg-[color:var(--color-surface)] border border-[color:var(--color-border)]",
    bordered: "bg-transparent border border-[color:var(--color-border)]",
    glass: "bg-[color:var(--color-surface)]/60 backdrop-blur-md border border-[color:var(--color-border)]/60",
    highlight: "bg-gradient-to-b from-[color:var(--color-surface)] to-[color:var(--color-bg)] border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/40",
  };

  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  return (
    <div className={`${base} ${variants[variant]} ${paddings[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <h3 className={`font-bold text-sm text-[color:var(--color-fg)] ${className}`}>{children}</h3>
  );
}

export function CardDescription({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <p className={`text-xs text-[color:var(--color-muted)] mt-0.5 ${className}`}>{children}</p>
  );
}
