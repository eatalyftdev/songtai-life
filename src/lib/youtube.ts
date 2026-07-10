// Shared helpers for parsing/embedding YouTube URLs safely.
// Non-negotiable: never trust raw input into an iframe src — always run it
// through extractYouTubeId() first and only render when a valid 11-char ID
// comes back.

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts the 11-character YouTube video ID from any common URL shape:
 * watch?v=, youtu.be/, /embed/, /shorts/, with or without extra query params.
 * Returns null if the input isn't a recognizable/valid YouTube URL.
 */
export function extractYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Bare 11-char ID pasted directly.
  if (YOUTUBE_ID_RE.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (!/(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$|^youtu\.be$/.test(host)) {
    return null;
  }

  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (url.pathname === "/watch") {
    candidate = url.searchParams.get("v");
  } else {
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex(p => p === "embed" || p === "shorts" || p === "live");
    if (idx !== -1 && parts[idx + 1]) candidate = parts[idx + 1];
  }

  return candidate && YOUTUBE_ID_RE.test(candidate) ? candidate : null;
}

export function isValidYouTubeUrl(input: string | null | undefined): boolean {
  return extractYouTubeId(input) !== null;
}

/** Privacy-enhanced embed URL — never render an iframe with an unvalidated src. */
export function getYouTubeEmbedUrl(videoIdOrUrl: string | null | undefined): string | null {
  const id = extractYouTubeId(videoIdOrUrl);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

/** Highest-quality thumbnail that YouTube guarantees exists for every video. */
export function getYouTubeThumbnail(videoIdOrUrl: string | null | undefined): string | null {
  const id = extractYouTubeId(videoIdOrUrl);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function getYouTubeWatchUrl(videoIdOrUrl: string | null | undefined): string | null {
  const id = extractYouTubeId(videoIdOrUrl);
  if (!id) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}
