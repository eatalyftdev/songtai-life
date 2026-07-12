import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  icon?: ReactNode;
  iconColor?: string;
  trend?: { value: number; label?: string };
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  value,
  unit,
  sub,
  icon,
  iconColor = "text-[color:var(--color-primary)]",
  trend,
  onClick,
  className = "",
}: StatCardProps) {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-b from-[color:var(--color-surface)] to-[color:var(--color-bg)] 
        border border-[color:var(--color-border)] rounded-2xl p-5 relative overflow-hidden text-left
        ${isClickable ? "cursor-pointer hover:border-[color:var(--color-primary)]/40 group transition-all" : ""}
        ${className}`}
    >
      {icon && (
        <div className={`absolute top-4 right-4 p-2 bg-[color:var(--color-border)]/50 rounded-xl ${iconColor} ${isClickable ? "group-hover:scale-110 transition-transform" : ""}`}>
          {icon}
        </div>
      )}

      <p className="text-[color:var(--color-muted)] text-xs font-semibold uppercase tracking-wide">{label}</p>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-black text-[color:var(--color-fg)] leading-none">{value}</span>
        {unit && <span className="text-xs text-[color:var(--color-gold)] font-medium">{unit}</span>}
      </div>

      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-[11px] font-bold ${trend.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          <span>{trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%</span>
          {trend.label && <span className="text-[color:var(--color-muted)] font-normal">{trend.label}</span>}
        </div>
      )}

      {sub && !trend && (
        <p className="mt-3 text-[11px] text-[color:var(--color-muted)] flex items-center gap-1">{sub}</p>
      )}
    </div>
  );
}
