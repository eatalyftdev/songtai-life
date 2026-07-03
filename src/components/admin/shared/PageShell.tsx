import { ReactNode, MouseEventHandler } from "react";

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <div className="p-6 space-y-6 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-white text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-stone-500 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-stone-900 border border-stone-800 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function TableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-[11px] font-semibold text-stone-500 uppercase tracking-wider border-b border-stone-800 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "", onClick }: {
  children: ReactNode; className?: string; onClick?: MouseEventHandler<HTMLTableCellElement>;
}) {
  return (
    <td className={`px-4 py-3 text-stone-300 text-xs align-middle ${className}`} onClick={onClick}>
      {children}
    </td>
  );
}

export function Btn({
  children, onClick, variant = "primary", size = "sm", disabled = false, loading = false, className = ""
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "gold";
  size?: "xs" | "sm" | "md";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const variants = {
    primary: "bg-[#0A7D32] hover:bg-[#086327] text-white",
    gold:    "bg-[#C9A227] hover:bg-[#b08f20] text-stone-950",
    secondary:"bg-stone-800 hover:bg-stone-700 text-stone-200",
    danger:  "bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-900/50",
    ghost:   "bg-transparent hover:bg-stone-800 text-stone-400 hover:text-white",
  };
  const sizes = {
    xs: "px-2.5 py-1 text-[11px] rounded-lg",
    sm: "px-3.5 py-1.5 text-xs rounded-xl",
    md: "px-5 py-2.5 text-sm rounded-xl",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 text-xs placeholder-stone-500 focus:outline-none focus:border-[#0A7D32] w-48 transition-all"
    />
  );
}

export function Select({ value, onChange, children, className = "" }: {
  value: string; onChange: (v: string) => void; children: ReactNode; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 text-xs focus:outline-none focus:border-[#0A7D32] cursor-pointer ${className}`}
    >
      {children}
    </select>
  );
}
