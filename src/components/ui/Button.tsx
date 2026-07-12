import { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  className = "",
  disabled,
  onClick,
  type = "button",
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-primary)] cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary:
      "bg-[color:var(--color-primary)] hover:opacity-90 text-white keep-white shadow-md hover:-translate-y-0.5 active:translate-y-0",
    secondary:
      "bg-[color:var(--color-surface)] border border-[color:var(--color-border)] text-[color:var(--color-fg)] hover:border-[color:var(--color-primary)]/60 hover:bg-[color:var(--color-border)]/40",
    ghost:
      "bg-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-border)]/40",
    danger:
      "bg-red-600/10 border border-red-600/20 text-red-400 hover:bg-red-600/20 hover:border-red-600/40",
    gold: "bg-[color:var(--color-gold)]/10 border border-[color:var(--color-gold)]/30 text-[color:var(--color-gold)] hover:bg-[color:var(--color-gold)]/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-xs",
    lg: "px-6 py-3.5 text-sm",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
}
