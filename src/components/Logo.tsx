import { useState } from "react";
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
  const [brandFailed, setBrandFailed] = useState(false);

  const sizeMap = {
    sm: { height: 28, wrap: "rounded-lg", text: "text-sm" },
    md: { height: 36, wrap: "rounded-xl", text: "text-base" },
    lg: { height: 44, wrap: "rounded-xl", text: "text-lg" },
  };
  const s = sizeMap[size];

  // Priority: Supabase dark/light logo → bundled SVG → Sprout fallback
  const supabaseUrl = theme === "dark" && branding.logo_dark_url
    ? branding.logo_dark_url
    : branding.logo_url;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 ${onClick ? "cursor-pointer group" : ""} ${className}`}
    >
      {supabaseUrl && !brandFailed ? (
        <img
          src={supabaseUrl}
          alt="Songtai Life"
          className={`${s.wrap} object-contain ${theme === "light" ? "" : "brightness-110"}`}
          style={{ maxHeight: s.height }}
          onError={() => setBrandFailed(true)}
        />
      ) : (
        <img
          src="/brand/logo.svg"
          alt="Songtai Life"
          className={`object-contain ${onClick ? "group-hover:scale-105 transition-transform duration-300" : ""}`}
          style={{ height: s.height, width: s.height }}
          onError={e => {
            // Final fallback: hide the broken img, show Sprout below via state
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      <span
        className={`font-sans font-bold ${s.text} tracking-tight ${
          theme === "dark" ? "text-white" : "text-stone-900"
        } ${onClick ? "group-hover:text-[color:var(--color-gold)] transition-colors duration-300" : ""}`}
      >
        Songtai <span className="font-normal text-[color:var(--color-gold)]">Life</span>
      </span>
    </div>
  );
}
