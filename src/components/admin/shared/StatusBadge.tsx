const CONFIGS: Record<string, { bg: string; text: string; dot?: string; pulse?: boolean }> = {
  pending:    { bg: "bg-stone-800",    text: "text-stone-300",  dot: "bg-stone-400" },
  paid:       { bg: "bg-blue-950/60",  text: "text-blue-300",   dot: "bg-blue-400" },
  processing: { bg: "bg-amber-950/60", text: "text-amber-300",  dot: "bg-amber-400" },
  shipped:    { bg: "bg-violet-950/60",text: "text-violet-300", dot: "bg-violet-400" },
  delivered:  { bg: "bg-emerald-950/60",text:"text-emerald-300",dot: "bg-emerald-400" },
  cancelled:  { bg: "bg-red-950/60",   text: "text-red-300",    dot: "bg-red-400" },
  completed:  { bg: "bg-emerald-950/60",text:"text-emerald-300",dot: "bg-emerald-400" },
  failed:     { bg: "bg-red-950/60",   text: "text-red-300",    dot: "bg-red-400" },
  requested:  { bg: "bg-amber-950/60", text: "text-amber-300",  dot: "bg-amber-400" },
  none:       { bg: "bg-stone-800",    text: "text-stone-400",  dot: "bg-stone-500" },
  verified:   { bg: "bg-emerald-950/60",text:"text-emerald-300",dot: "bg-emerald-400" },
  rejected:   { bg: "bg-red-950/60",   text: "text-red-300",    dot: "bg-red-400" },
  published:  { bg: "bg-emerald-950/60",text:"text-emerald-300",dot: "bg-emerald-400" },
  draft:      { bg: "bg-stone-800",    text: "text-stone-300",  dot: "bg-stone-500" },
  archived:   { bg: "bg-stone-900",    text: "text-stone-500",  dot: "bg-stone-600" },
  confirmed:  { bg: "bg-blue-950/60",  text: "text-blue-300",   dot: "bg-blue-400" },
  unread:     { bg: "bg-amber-950/60", text: "text-amber-300",  dot: "bg-amber-400", pulse: true },
  read:       { bg: "bg-stone-800",    text: "text-stone-400",  dot: "bg-stone-500" },
  responded:  { bg: "bg-emerald-950/60",text:"text-emerald-300",dot: "bg-emerald-400" },
  bronze:     { bg: "bg-orange-950/60",text: "text-orange-300", dot: "bg-orange-400" },
  silver:     { bg: "bg-slate-800",    text: "text-slate-300",  dot: "bg-slate-400" },
  gold:       { bg: "bg-yellow-950/60",text: "text-yellow-300", dot: "bg-yellow-400" },
  platinum:   { bg: "bg-cyan-950/60",  text: "text-cyan-300",   dot: "bg-cyan-400" },
  diamond:    { bg: "bg-purple-950/60",text: "text-purple-300", dot: "bg-purple-400" },
  direct:     { bg: "bg-emerald-950/60",text:"text-emerald-300",dot: "bg-emerald-400" },
  level:      { bg: "bg-blue-950/60",  text: "text-blue-300",   dot: "bg-blue-400" },
  rank_bonus: { bg: "bg-yellow-950/60",text: "text-yellow-300", dot: "bg-yellow-400" },
  leadership: { bg: "bg-purple-950/60",text: "text-purple-300", dot: "bg-purple-400" },
  mtn_momo:   { bg: "bg-yellow-950/60",text: "text-yellow-300", dot: "bg-yellow-400" },
  orange_money:{ bg:"bg-orange-950/60",text: "text-orange-300", dot: "bg-orange-400" },
  approved:   { bg: "bg-emerald-950/60",text:"text-emerald-300",dot: "bg-emerald-400" },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIGS[status?.toLowerCase()] ?? { bg: "bg-stone-800", text: "text-stone-400", dot: "bg-stone-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot ?? "bg-stone-500"} ${cfg.pulse ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}
