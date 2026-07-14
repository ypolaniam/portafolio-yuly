export type VideoSource = "cloudinary" | "youtube";

export interface ProjectVideo {
  source: VideoSource;
  // Cloudinary secure_url OR YouTube watch/embed URL.
  url: string;
  // Seconds: start of the clip (Cloudinary) / autoplay point (YouTube).
  start?: number;
  // Seconds: length of the Cloudinary clip. Ignored on the home for YouTube.
  duration?: number;
}

export interface Project {
  slug: string;
  title: string;
  category: string;
  image: string;
  description: string;
  metrics?: string | string[];
  tools?: string[];
  year: string;
  size?: "large" | "medium" | "small";
  // Visibility toggle. `undefined` / `true` => visible; `false` => hidden from the public site.
  visible?: boolean;
  // Extra images shown in a gallery on the public detail page.
  gallery?: string[];
  // Optional video cover. When present, the home shows the looping video; the
  // detail page shows a natural player. Falls back to `image` when absent.
  video?: ProjectVideo;
}

export type CardMode = "display" | "edit";
