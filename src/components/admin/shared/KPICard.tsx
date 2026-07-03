import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  highlight?: boolean;
  loading?: boolean;
  sparkline?: number[];
}

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 28;
  const w = 64;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline points={pts} fill="none" stroke={positive ? "#22c55e" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function KPICard({ icon: Icon, iconColor = "text-[#C9A227]", label, value, change, changeLabel, highlight, loading, sparkline }: KPICardProps) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className={`bg-stone-900 border rounded-2xl p-5 flex flex-col gap-3 ${highlight ? "border-[#C9A227]/40 shadow-[0_0_20px_rgba(201,162,39,0.08)]" : "border-stone-800"}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-stone-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
          {loading ? (
            <div className="h-7 w-28 bg-stone-800 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-white text-2xl font-bold mt-1.5 font-mono">{value}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-stone-800/60 flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        {change !== undefined ? (
          <div className={`flex items-center gap-1 text-xs font-semibold ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{positive ? "+" : ""}{change?.toFixed(1)}%</span>
            {changeLabel && <span className="text-stone-500 font-normal">{changeLabel}</span>}
          </div>
        ) : (
          changeLabel && <span className="text-xs text-stone-500">{changeLabel}</span>
        )}
        {sparkline && <MiniSparkline data={sparkline} positive={positive} />}
      </div>
    </div>
  );
}
