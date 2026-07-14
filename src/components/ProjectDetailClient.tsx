import { useEffect, useState, useRef } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getOptimizedImageUrl } from "../lib/cloudinary";
import type { Project } from "../types/project";
import { sanitizeHtml } from "../lib/html";
import ProjectCarousel from "./ProjectCarousel.tsx";
import Lightbox from "./Lightbox.tsx";
import ProjectCoverMedia from "./ProjectCoverMedia.tsx";
import ProjectSections from "./ProjectSections.tsx";

export default function ProjectDetailClient({ initialSlug, initialProject }: { initialSlug: string | undefined; initialProject?: Project }) {
  const [project, setProject] = useState<Project | null>(initialProject ?? null);
  const [loading, setLoading] = useState(!initialProject);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!initialSlug) {
      setLoading(false);
      return;
    }
    if (!db) {
      // Firebase not configured (e.g. local preview without .env): there is no
      // live data to read, so show the "not found" state instead of hanging.
      setProject(null);
      setLoading(false);
      return;
    }

    const settingsRef = doc(db, "settings", "cache");
    const unsub = onSnapshot(settingsRef, (snap) => {
      const data = (snap.data() as { projects?: Project[] } | undefined);
      const found = data?.projects?.find((p) => p.slug === initialSlug) ?? null;
      setProject(found);
      setLoading(false);
    });

    return () => unsub();
  }, [initialSlug]);

  if (loading) {
    return (
      <article className="project-detail">
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>Cargando proyecto...</div>
      </article>
    );
  }

  if (!project) {
    return (
      <article className="project-detail">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, marginBottom: "1rem" }}>Proyecto no encontrado</h1>
          <p style={{ color: "var(--color-text-light)", marginBottom: "2rem" }}>El proyecto que buscas no existe o fue eliminado.</p>
          <a href="/#trabajo" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Volver al portafolio
          </a>
        </div>
      </article>
    );
  }

  return (
    <article className="project-detail">
      <div className="reveal">
        <header className="project-detail-header">
          <a href="/#trabajo" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Volver
          </a>
          <span className="project-category">{project.category}</span>
          <h1 className="project-detail-title">{project.title}</h1>
        </header>
      </div>

      <div className="reveal" style={{ transitionDelay: "150ms" }}>
        <figure className="project-detail-image">
          <ProjectCoverMedia project={project} variant="player" />
        </figure>
      </div>

      <div className="reveal" style={{ transitionDelay: "300ms" }}>
        <div className="project-detail-body">
          <div
            className="project-lead"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(project.description) }}
          />

          {project.sections && project.sections.length > 0 && (
            <ProjectSections sections={project.sections} />
          )}

          <div className="project-meta">
            <div className="meta-item">
              <span className="meta-label">Año</span>
              <span className="meta-value">{project.year}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Rol</span>
              <span className="meta-value">Diseñadora</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Herramientas</span>
              <span className="meta-value">{project.tools?.join(", ") || "Figma, Adobe CC"}</span>
            </div>
          </div>

          {project.metrics && (
            <div className="project-metrics-section">
              <h3 className="metrics-title">Resultados</h3>
              <div className="metrics-grid">
                {Array.isArray(project.metrics)
                  ? project.metrics.map((m) => (
                      <div key={m} className="metric-card">
                        <span className="metric-value">{m}</span>
                      </div>
                    ))
                  : (
                      <div className="metric-card">
                        <span className="metric-value">{project.metrics}</span>
                      </div>
                    )}
              </div>
            </div>
          )}

        </div>
      </div>

      {project.gallery && project.gallery.length > 0 && (
        <div className="reveal project-gallery-section">
          <h2 className="gallery-section-title">Galería</h2>
          <div className="gallery-grid">
            {project.gallery.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                className="gallery-thumb"
                aria-label={`Ver imagen ${i + 1} en grande`}
                onClick={() => setLightboxIndex(i)}
              >
                <img src={getOptimizedImageUrl(src, 400)} alt={`Imagen ${i + 1} del proyecto`} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      <ProjectCarousel currentSlug={project.slug} />

      {lightboxIndex !== null && project.gallery && (
        <Lightbox
          images={project.gallery}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </article>
  );
}
