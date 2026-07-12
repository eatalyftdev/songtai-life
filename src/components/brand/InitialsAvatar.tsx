/**
 * Designed placeholder avatar — used whenever we don't have a real photo of a
 * real person. Renders initials on a brand-gradient circle instead of a
 * mismatched stock headshot presented as if it were a real team member or
 * customer. Real photos (uploaded via the admin CMS) always take priority;
 * this is purely the honest fallback.
 */
export default function InitialsAvatar({
  name,
  size = 64,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join("") || "?";

  return (
    <div
      className={`rounded-full flex items-center justify-center font-extrabold text-white select-none shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-primary) 100%)",
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
