import React, { useEffect, useRef, useState, useCallback } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getOptimizedImageUrl } from "../lib/cloudinary";
import { initialProjects } from "../data/projects";
import type { Project } from "../types/project";

interface ProjectCarouselProps {
  currentSlug: string;
}

export default function ProjectCarousel({ currentSlug }: ProjectCarouselProps) {
  // Seed with the static projects so the carousel always has content, even if
  // Firebase isn't configured or `settings/cache` has no projects yet. This
  // restores the original behaviour (the .astro version used static data).
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const trackRef = useRef<HTMLDivElement>(null);
  // Lets the buttons trigger the same "user interacted" pause as the old script.
  const interactionRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!db) {
      setProjects(initialProjects);
      return;
    }
    const unsub = onSnapshot(doc(db, "settings", "cache"), (snap) => {
      const data = snap.data() as { projects?: Project[] } | undefined;
      const fb = data?.projects;
      setProjects(fb && fb.length ? fb : initialProjects);
    });
    return () => unsub();
  }, []);

  const related = projects.filter((p) => p.slug !== currentSlug);
  const repeated = [...related, ...related, ...related];

  const getStep = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 320;
    const cards = Array.from(track.querySelectorAll<HTMLElement>(".project-card"));
    const first = cards[0];
    const second = cards[1];
    if (first && second && second.offsetLeft > first.offsetLeft) {
      return second.offsetLeft - first.offsetLeft;
    }
    if (first) {
      const style = getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      return first.offsetWidth + gap;
    }
    return 320;
  }, []);

  const scrollBy = useCallback(
    (dir: 1 | -1) => {
      const track = trackRef.current;
      if (!track) return;
      const step = getStep();
      track.style.scrollBehavior = "smooth";
      track.scrollLeft += step * dir;
    },
    [getStep]
  );

  // Layout, infinite-loop normalization and autoplay. Re-runs when the set of
  // related projects changes so it always measures the current cards.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !related.length) return;

    const relatedCount = related.length;
    const step = getStep();
    let isNormalizing = false;
    let autoplayTimer: any = null;
    let resumeTimer: any = null;
    let normalizeTimeout: any = null;
    let lastInteraction = Date.now();
    const AUTOPLAY_DELAY = 2200;
    const RESUME_DELAY = 2000;
    const COOLDOWN = 2200;

    const normalize = () => {
      const s = getStep();
      const maxScroll = track.scrollWidth - track.clientWidth;
      const left = track.scrollLeft;

      if (left < s * 0.5 && maxScroll > 0) {
        isNormalizing = true;
        track.style.scrollBehavior = "auto";
        track.scrollLeft = maxScroll;
        requestAnimationFrame(() => {
          isNormalizing = false;
        });
        return;
      }

      if (left > maxScroll - s * 0.5 && maxScroll > 0) {
        isNormalizing = true;
        track.style.scrollBehavior = "auto";
        track.scrollLeft = s;
        requestAnimationFrame(() => {
          isNormalizing = false;
        });
      }
    };

    const startAutoplay = () => {
      stopAutoplay();
      autoplayTimer = setInterval(() => {
        if (Date.now() - lastInteraction >= COOLDOWN && !track.matches(":hover")) {
          track.style.scrollBehavior = "smooth";
          track.scrollLeft += getStep();
        }
      }, AUTOPLAY_DELAY);
    };

    const stopAutoplay = () => {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    };

    const resetAutoplayCooldown = () => {
      stopAutoplay();
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        if (Date.now() - lastInteraction >= COOLDOWN) {
          startAutoplay();
        }
      }, RESUME_DELAY);
    };

    // Exposed to the buttons so a click pauses autoplay like user interaction.
    interactionRef.current = () => {
      lastInteraction = Date.now();
      stopAutoplay();
      if (resumeTimer) clearTimeout(resumeTimer);
      resetAutoplayCooldown();
    };

    const onScroll = () => {
      clearTimeout(normalizeTimeout);
      normalizeTimeout = setTimeout(() => {
        if (!isNormalizing) normalize();
      }, 80);
    };
    const onEnter = () => stopAutoplay();
    const onLeave = () => {
      lastInteraction = Date.now();
      resetAutoplayCooldown();
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("pointerenter", onEnter);
    track.addEventListener("pointerleave", onLeave);

    // Start positioned at the beginning of the 2nd copy so it can scroll both ways.
    track.style.scrollBehavior = "auto";
    track.scrollLeft = step * relatedCount;
    normalize();
    startAutoplay();

    return () => {
      stopAutoplay();
      if (resumeTimer) clearTimeout(resumeTimer);
      clearTimeout(normalizeTimeout);
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("pointerenter", onEnter);
      track.removeEventListener("pointerleave", onLeave);
      interactionRef.current = () => {};
    };
  }, [related.length, getStep]);

  if (!related.length) return null;

  return (
    <section
      className="related-projects"
      aria-labelledby="related-projects-title"
      data-current-slug={currentSlug}
    >
      <div
        id="related-carousel-state"
        data-related-count={related.length}
        hidden
      />

      <div className="related-header">
        <h2 id="related-projects-title" className="section-title reveal">
          Ver otros <span className="gradient-text">proyectos</span>
        </h2>
        <p className="section-description reveal-text" data-reveal="word">
          Explora más trabajos de branding, diseño digital y experiencia de usuario.
        </p>
      </div>

      <div className="carousel-wrapper">
        <button
          className="carousel-btn carousel-btn-prev"
          aria-label="Anterior"
          type="button"
          onClick={() => {
            interactionRef.current();
            scrollBy(-1);
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="carousel-track" ref={trackRef}>
          {repeated.map((project, index) => (
            <article key={`${project.slug}-${index}`} className="project-card">
              <a href={`/trabajo/${project.slug}/`} className="project-card-link" aria-label={`Ver detalle: ${project.title}`}>
                <div className="project-card-image">
                  <img src={getOptimizedImageUrl(project.image)} alt={project.title} loading="lazy" />
                  <div className="project-card-overlay">
                    <span className="overlay-title">Ver proyecto →</span>
                    {project.metrics ? (
                      <span className="overlay-metric">
                        {typeof project.metrics === "string" ? project.metrics : project.metrics[0]}
                      </span>
                    ) : (
                      ""
                    )}
                  </div>
                  <span className="project-card-tag">{project.category}</span>
                </div>
                <div className="project-card-content">
                  <h3 className="project-title">{project.title}</h3>
                  {project.metrics ? (
                    <div className="project-metrics">
                      <span className="metric">
                        {Array.isArray(project.metrics) ? project.metrics[0] : project.metrics}
                      </span>
                    </div>
                  ) : (
                    ""
                  )}
                </div>
              </a>
            </article>
          ))}
        </div>
        <button
          className="carousel-btn carousel-btn-next"
          aria-label="Siguiente"
          type="button"
          onClick={() => {
            interactionRef.current();
            scrollBy(1);
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
