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
  // Internal ordering timestamp (set by the data layer on write).
  createdAt?: number;
  // Extra images shown in a gallery on the public detail page.
  gallery?: string[];
  // Which media is used as the cover: the static `image` or a `video`.
  // Stored explicitly so the choice is unambiguous (a project can keep a
  // video but still show its image as the cover). Falls back to video-when-present
  // for older records that didn't set this field.
  coverType?: "image" | "video";
  // Optional video cover. When present and `coverType === "video"`, the home
  // shows the looping video; the detail page shows a natural player. Falls back
  // to `image` when absent or when `coverType === "image"`.
  video?: ProjectVideo;
}

export type CardMode = "display" | "edit";
