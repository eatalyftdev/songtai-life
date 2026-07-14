import { ImgHTMLAttributes } from "react";
import { SUPABASE_URL } from "../lib/supabase";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "src"> {
  src: string;
  /** Target render width in px — drives the Supabase CDN transform and the `sizes` fallback. */
  width?: number;
  /** JPEG/WebP quality for the transform, 1-100. Default 75. */
  quality?: number;
  /** Above-the-fold images: skip lazy-loading and hint the browser to fetch eagerly. */
  priority?: boolean;
}

/**
 * Rewrites a Supabase Storage public URL to Supabase's on-the-fly image
 * transform ("render/image") endpoint so the CDN serves a resized,
 * quality-capped image instead of the original file. Falls back to the
 * original URL untouched for any src that isn't a Supabase Storage object
 * (external URLs, data URIs, etc.) or if the transform 404s.
 */
function toCdnUrl(src: string, width?: number, quality?: number): string {
  if (!SUPABASE_URL || !src.startsWith(`${SUPABASE_URL}/storage/v1/object/public/`)) {
    return src;
  }
  const objectPath = src.slice(`${SUPABASE_URL}/storage/v1/object/public/`.length);
  const params = new URLSearchParams();
  if (width) params.set("width", String(width));
  params.set("quality", String(quality ?? 75));
  return `${SUPABASE_URL}/storage/v1/render/image/public/${objectPath}?${params.toString()}`;
}

export default function OptimizedImage({
  src,
  width,
  quality,
  priority = false,
  alt,
  className,
  sizes,
  onError,
  ...rest
}: OptimizedImageProps) {
  const cdnSrc = toCdnUrl(src, width, quality);

  return (
    <img
      src={cdnSrc}
      alt={alt ?? ""}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      sizes={sizes ?? (width ? `${width}px` : undefined)}
      onError={(e) => {
        // Transform endpoint unavailable (e.g. plan without image transforms,
        // or a non-Supabase URL that slipped through) — fall back to the
        // original file so the image never breaks.
        const img = e.currentTarget;
        if (img.src !== src) {
          img.src = src;
        } else if (onError) {
          onError(e);
        }
      }}
      {...rest}
    />
  );
}
