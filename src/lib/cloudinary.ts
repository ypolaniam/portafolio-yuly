export function getOptimizedImageUrl(url: string, width = 800): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;

  const regex = /\/upload\/(?:[^/]+\/)?(.*)$/;
  const match = url.match(regex);
  if (!match) return url;

  const publicId = match[1].replace(/\.[^.]+$/, "");

  return `https://res.cloudinary.com/${import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
}

/**
 * Extracts a YouTube video ID from watch/shorten/embed/shorts URLs.
 * Returns null when the URL can't be parsed.
 */
export function parseYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const patterns: RegExp[] = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

/**
 * Builds a YouTube embed URL.
 * - Home cover (loop): autoplay + muted + loop (playlist=ID) + start, no controls.
 * - Detail player: natural controls, no autoplay.
 */
export function getYouTubeEmbedUrl(
  id: string,
  opts: { start?: number; loop?: boolean } = {}
): string {
  const params = new URLSearchParams();
  params.set("playsinline", "1");
  params.set("modestbranding", "1");
  params.set("rel", "0");

  if (opts.loop) {
    params.set("autoplay", "1");
    params.set("mute", "1");
    params.set("loop", "1");
    params.set("playlist", id);
    params.set("controls", "0");
    if (typeof opts.start === "number" && isFinite(opts.start) && opts.start > 0) {
      params.set("start", String(Math.round(opts.start)));
    }
  } else {
    params.set("autoplay", "0");
    params.set("controls", "1");
    if (typeof opts.start === "number" && isFinite(opts.start) && opts.start > 0) {
      params.set("start", String(Math.round(opts.start)));
    }
  }

  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
