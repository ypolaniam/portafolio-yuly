export function getOptimizedImageUrl(url: string, width = 800): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;

  const regex = /\/upload\/(?:[^/]+\/)?(.*)$/;
  const match = url.match(regex);
  if (!match) return url;

  const publicId = match[1].replace(/\.[^.]+$/, "");

  return `https://res.cloudinary.com/${import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
}

export function isCloudinaryVideo(url: string): boolean {
  if (!url) return false;
  return /\/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(url);
}

/**
 * Derives a Cloudinary video URL with optional start/duration trimming.
 * - Home cover (start/duration given): pre-cropped clip `so_<start>,du_<duration>`.
 * - Detail player (no trim): full video, no JS timing needed.
 * Non-Cloudinary video URLs are returned unchanged.
 */
export function getCloudinaryVideoUrl(
  url: string,
  opts: { start?: number; duration?: number; width?: number } = {}
): string {
  if (!isCloudinaryVideo(url)) return url;

  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return url;

  const match = url.match(/\/video\/upload\/(?:[^/]+\/)?(.*)$/);
  if (!match) return url;

  const publicId = match[1].replace(/\.[^.]+$/, "");

  const transforms: string[] = ["f_auto", "q_auto"];
  if (typeof opts.start === "number" && isFinite(opts.start)) transforms.push(`so_${Math.max(0, Math.round(opts.start))}`);
  if (typeof opts.duration === "number" && isFinite(opts.duration)) transforms.push(`du_${Math.max(1, Math.round(opts.duration))}`);
  if (opts.width) transforms.push(`w_${opts.width}`);

  return `https://res.cloudinary.com/${cloudName}/video/upload/${transforms.join(",")}/${publicId}`;
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
