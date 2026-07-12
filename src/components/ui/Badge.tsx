import { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "gold" | "info" | "rank";

const RANK_STYLES: Record<string, string> = {
  bronze:   "bg-amber-900/20 border-amber-700/30 text-amber-400",
  silver:   "bg-stone-700/20 border-stone-500/30 text-stone-300",
  gold:     "bg-yellow-900/20 border-yellow-600/30 text-yellow-300",
  platinum: "bg-cyan-900/20 border-cyan-600/30 text-cyan-300",
  diamond:  "bg-purple-900/20 border-purple-600/30 text-purple-300",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  rank?: string;
  children?: ReactNode;
  dot?: boolean;
  className?: string;
}

export function Badge({ variant = "default", rank, children, dot = false, className = "", ...props }: BadgeProps) {
  const base = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border";

  const variants: Record<BadgeVariant, string> = {
    default: "bg-[color:var(--color-border)]/60 border-[color:var(--color-border)] text-[color:var(--color-muted)]",
    success: "bg-emerald-900/20 border-emerald-700/30 text-emerald-400",
    warning: "bg-amber-900/20 border-amber-700/30 text-amber-400",
    danger:  "bg-red-900/20 border-red-700/30 text-red-400",
    gold:    "bg-yellow-900/20 border-yellow-600/30 text-[color:var(--color-gold)]",
    info:    "bg-blue-900/20 border-blue-700/30 text-blue-400",
    rank:    rank ? (RANK_STYLES[rank] ?? RANK_STYLES.bronze) : RANK_STYLES.bronze,
  };

  const style = variant === "rank" && rank ? RANK_STYLES[rank] ?? RANK_STYLES.bronze : variants[variant];

  return (
    <span className={`${base} ${style} ${className}`} {...props}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
