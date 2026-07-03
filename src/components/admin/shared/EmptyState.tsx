import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-stone-800/60 border border-stone-700/50 flex items-center justify-center">
        <Icon className="w-7 h-7 text-stone-500" />
      </div>
      <div>
        <p className="text-stone-300 font-semibold text-sm">{title}</p>
        {description && <p className="text-stone-500 text-xs mt-1">{description}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-4 py-2 bg-[#0A7D32] hover:bg-[#086327] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
