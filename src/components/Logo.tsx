import { Sprout } from "lucide-react";
import { useSiteSettings } from "../hooks/useSiteSettings";

interface LogoProps {
  theme?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

export default function Logo({ theme = "dark", size = "md", onClick, className = "" }: LogoProps) {
  const { branding } = useSiteSettings();

  const sizeMap = {
    sm: { icon: "w-3.5 h-3.5", wrap: "p-1.5 rounded-lg", text: "text-sm" },
    md: { icon: "w-4 h-4", wrap: "p-2 rounded-xl", text: "text-base" },
    lg: { icon: "w-5 h-5", wrap: "p-2.5 rounded-xl", text: "text-lg" },
  };
  const s = sizeMap[size];

  const logoUrl = theme === "dark" && branding.logo_dark_url
    ? branding.logo_dark_url
    : branding.logo_url;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 ${onClick ? "cursor-pointer group" : ""} ${className}`}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Songtai Life"
          className={`${s.wrap} object-contain ${theme === "light" ? "" : "brightness-110"}`}
          style={{ maxHeight: size === "sm" ? 28 : size === "md" ? 36 : 44 }}
        />
      ) : (
        <div className={`${s.wrap} bg-gradient-to-tr from-emerald-700 to-[color:var(--color-gold)] text-white shadow-md shadow-emerald-950/20 ${onClick ? "group-hover:scale-105 transition-transform duration-300" : ""}`}>
          <Sprout className={s.icon} />
        </div>
      )}
      <span className={`font-sans font-bold ${s.text} tracking-tight ${theme === "dark" ? "text-white" : "text-stone-900"} ${onClick ? "group-hover:text-[color:var(--color-gold)] transition-colors duration-300" : ""}`}>
        Songtai <span className="font-normal text-[color:var(--color-gold)]">Life</span>
      </span>
    </div>
  );
}
