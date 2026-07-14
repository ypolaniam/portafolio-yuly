import { useEffect, useRef, useState } from "react";
import type { Project } from "../types/project";
import { getOptimizedImageUrl, getCloudinaryVideoUrl, getYouTubeEmbedUrl, parseYouTubeId } from "../lib/cloudinary";

const FALLBACK_IMAGE = "https://placehold.co/800x500/8B5CF6/FFFFFF?text=Proyecto";

export interface ProjectCoverMediaProps {
  project: Project;
  variant: "loop" | "player";
  className?: string;
}

/**
 * Renders the project cover as a looping muted video (home) or a natural player
 * (detail), falling back to the static `image` when no video is set.
 *
 * variant="loop"  -> home cards (autoplay, muted, loop, pre-trimmed segment).
 * variant="player"-> detail page (full video, native controls).
 */
export default function ProjectCoverMedia({ project, variant, className }: ProjectCoverMediaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(variant === "player");
  const [imgError, setImgError] = useState(false);

  const video = project.video;
  const youTubeId = video?.source === "youtube" ? parseYouTubeId(video.url) : null;
  const cloudinaryVideo = video?.source === "cloudinary" ? video.url : null;

  // IntersectionObserver: only play/pause when the cover is near the viewport
  // (loop variant). For YouTube, lazily mount the iframe only when near view.
  useEffect(() => {
    if (variant === "player") return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setInView(entry.isIntersecting);
      },
      { rootMargin: "200px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [variant]);

  // Play/pause the native <video> based on visibility.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !inView || variant !== "loop") return;
    const playPromise = v.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        /* autoplay may be blocked until interaction; ignored */
      });
    }
    return () => {
      v.pause();
    };
  }, [inView, variant, cloudinaryVideo]);

  const showImage = (!video && !imgError) || (variant === "loop" && youTubeId && !inView);

  if (showImage) {
    const src = project.image
      ? getOptimizedImageUrl(project.image)
      : FALLBACK_IMAGE;
    return (
      <div ref={containerRef} className={className}>
        <img
          src={imgError ? FALLBACK_IMAGE : src}
          alt={project.title}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // YouTube cover.
  if (youTubeId) {
    if (variant === "loop") {
      // Lazy mount: only render the iframe when near the viewport.
      if (!inView) {
        return <div ref={containerRef} className={className} />;
      }
      return (
        <div ref={containerRef} className={className}>
          <iframe
            src={getYouTubeEmbedUrl(youTubeId, { start: video?.start, loop: true })}
            title={project.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            frameBorder="0"
          />
        </div>
      );
    }
    return (
      <div ref={containerRef} className={className}>
        <iframe
          src={getYouTubeEmbedUrl(youTubeId)}
          title={project.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          frameBorder="0"
        />
      </div>
    );
  }

  // Cloudinary (or any other) video cover.
  const src =
    variant === "loop" && cloudinaryVideo
      ? getCloudinaryVideoUrl(cloudinaryVideo, { start: video?.start, duration: video?.duration })
      : cloudinaryVideo
        ? getCloudinaryVideoUrl(cloudinaryVideo)
        : "";

  if (!src) {
    const fallbackSrc = project.image ? getOptimizedImageUrl(project.image) : FALLBACK_IMAGE;
    return (
      <div ref={containerRef} className={className}>
        <img src={fallbackSrc} alt={project.title} loading="lazy" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      {variant === "loop" ? (
        <video
          ref={videoRef}
          src={src}
          poster={project.image || undefined}
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <video src={src} poster={project.image || undefined} controls playsInline preload="metadata" />
      )}
    </div>
  );
}
