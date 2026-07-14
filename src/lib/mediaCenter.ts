import { supabase } from "./supabase";

export type MediaFileType = "video" | "audio" | "document" | "image" | "archive";
export type MediaVisibility = "public" | "distributor_only";

export interface MediaCategory {
  id: string;
  categoryKey: string;
  nameEn: string;
  nameFr: string;
  displayOrder: number;
}

export interface MediaAsset {
  id: string;
  categoryId: string;
  titleEn: string;
  titleFr: string;
  descriptionEn: string | null;
  descriptionFr: string | null;
  fileUrl: string;
  thumbnailUrl: string | null;
  fileType: MediaFileType;
  mimeType: string | null;
  fileSizeBytes: number | null;
  visibility: MediaVisibility;
  isPublished: boolean;
  downloadCount: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaCategoryGroup {
  category: MediaCategory;
  assets: MediaAsset[];
}

function mapCategory(row: any): MediaCategory {
  return {
    id: row.id,
    categoryKey: row.category_key,
    nameEn: row.name_en,
    nameFr: row.name_fr,
    displayOrder: row.display_order ?? 0,
  };
}

function mapAsset(row: any): MediaAsset {
  return {
    id: row.id,
    categoryId: row.category_id,
    titleEn: row.title_en,
    titleFr: row.title_fr,
    descriptionEn: row.description_en ?? null,
    descriptionFr: row.description_fr ?? null,
    fileUrl: row.file_url,
    thumbnailUrl: row.thumbnail_url ?? null,
    fileType: row.file_type,
    mimeType: row.mime_type ?? null,
    fileSizeBytes: row.file_size_bytes ?? null,
    visibility: row.visibility,
    isPublished: row.is_published,
    downloadCount: row.download_count ?? 0,
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch published media assets grouped by category, ordered by category
 * display_order then asset display_order. Categories with zero visible
 * assets are omitted entirely (never render an empty category header).
 *
 * `scope`:
 *  - "public": visibility = 'public' only (unauthenticated Media Center page)
 *  - "distributor": visibility in ('public','distributor_only') — RLS on
 *    media_assets already restricts the distributor_only rows to authenticated
 *    distributors, so this scope just widens the client-side filter.
 */
export async function fetchMediaCenterGroups(
  scope: "public" | "distributor"
): Promise<MediaCategoryGroup[]> {
  const [{ data: categoryRows }, { data: assetRows }] = await Promise.all([
    supabase.from("media_categories").select("*").order("display_order", { ascending: true }),
    supabase
      .from("media_assets")
      .select("*")
      .eq("is_published", true)
      .in("visibility", scope === "distributor" ? ["public", "distributor_only"] : ["public"])
      .order("display_order", { ascending: true }),
  ]);

  const categories = (categoryRows ?? []).map(mapCategory);
  const assets = (assetRows ?? []).map(mapAsset);

  return categories
    .map(category => ({
      category,
      assets: assets.filter(a => a.categoryId === category.id),
    }))
    .filter(group => group.assets.length > 0);
}

/** Server-trusted download counter — increments via a SECURITY DEFINER RPC
 *  rather than a client-writable column, per the media_assets RLS design. */
export async function trackMediaDownload(assetId: string): Promise<void> {
  await supabase.rpc("increment_media_download_count", { p_asset_id: assetId });
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIdx = 0;
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024;
    unitIdx += 1;
  }
  return `${size.toFixed(size >= 10 || unitIdx === 0 ? 0 : 1)} ${units[unitIdx]}`;
}

export function detectFileType(mimeType: string): MediaFileType {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-zip-compressed" ||
    mimeType === "application/x-rar-compressed" ||
    mimeType === "application/x-7z-compressed"
  ) return "archive";
  return "document";
}
