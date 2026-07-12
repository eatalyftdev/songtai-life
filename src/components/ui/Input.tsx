import { ChangeEventHandler, FocusEventHandler, ReactNode, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  type?: string;
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  autoComplete?: string;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  pattern?: string;
  tabIndex?: number;
}

export function Input({
  label,
  hint,
  error,
  icon,
  iconRight,
  className = "",
  type = "text",
  ...props
}: InputProps) {
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPwd ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-bold text-[color:var(--color-muted)]">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)] pointer-events-none">
            {icon}
          </span>
        )}
        <input
          type={inputType}
          className={`w-full ${icon ? "pl-10" : "pl-4"} ${isPassword || iconRight ? "pr-10" : "pr-4"} py-3 
            bg-[color:var(--color-bg)] border ${error ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/30" : "border-[color:var(--color-border)] focus:border-[color:var(--color-primary)] focus:ring-[color:var(--color-primary)]/20"}
            rounded-xl text-[color:var(--color-fg)] placeholder-[color:var(--color-muted)]/50 
            text-sm outline-none focus:ring-2 transition-all ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPwd(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {!isPassword && iconRight && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)] pointer-events-none">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-[color:var(--color-muted)]">{hint}</p>}
    </div>
  );
}
