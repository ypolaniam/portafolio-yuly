import { useEffect, useRef, useState } from "react";
import type { Project } from "../types/project";
import { getOptimizedImageUrl, getYouTubeEmbedUrl, parseYouTubeId } from "../lib/cloudinary";

const FALLBACK_IMAGE = "https://placehold.co/800x500/8B5CF6/FFFFFF?text=Proyecto";

export interface ProjectCoverMediaProps {
  project: Project;
  variant: "loop" | "player";
  className?: string;
}

/**
 * Renders the project cover as a looping muted YouTube video (home) or a
 * natural player (detail), falling back to the static `image` when no valid
 * YouTube video is set.
 *
 * variant="loop"  -> home cards (autoplay, muted, loop, lazy-mounted iframe).
 * variant="player"-> detail page (full video, native controls).
 *
 * The cover choice is driven by `project.coverType` (explicit). Older records
 * without that field fall back to "video when a video exists, otherwise image".
 */
export default function ProjectCoverMedia({ project, variant, className }: ProjectCoverMediaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(variant === "player");
  const [imgError, setImgError] = useState(false);

  const coverType = project.coverType ?? (project.video ? "video" : "image");
  const video = coverType === "video" ? project.video : undefined;
  const youTubeId = video?.source === "youtube" ? parseYouTubeId(video.url) : null;

  // IntersectionObserver: only mount the YouTube iframe when near the viewport
  // (loop variant), to avoid loading every video at once.
  useEffect(() => {
    if (variant === "player") return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setInView(entries[0]?.isIntersecting ?? false);
      },
      { rootMargin: "200px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [variant]);

  // No YouTube video -> static image (or fallback).
  if (!youTubeId) {
    const src = imgError
      ? FALLBACK_IMAGE
      : project.image
        ? getOptimizedImageUrl(project.image)
        : FALLBACK_IMAGE;
    return (
      <div ref={containerRef} className={className}>
        <img
          src={src}
          alt={project.title}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // YouTube cover (loop variant): lazy mount.
  if (variant === "loop") {
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

  // YouTube cover (player variant).
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
