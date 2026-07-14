import type { Project } from "../types/project";
import { getOptimizedImageUrl } from "../lib/cloudinary";
import ProjectCoverMedia from "./ProjectCoverMedia";

interface ProjectLivePreviewProps {
  project: Project;
}

export default function ProjectLivePreview({ project }: ProjectLivePreviewProps) {
  const tools = project.tools && project.tools.length ? project.tools.join(", ") : "Figma, Adobe CC";
  const metrics = project.metrics
    ? Array.isArray(project.metrics)
      ? project.metrics
      : [project.metrics]
    : [];
  const gallery = project.gallery ?? [];

  return (
    <article className="project-detail" style={{ padding: "3rem", minHeight: "100%" }}>
      <header className="project-detail-header">
        <span className="project-category">{project.category || "Categoría"}</span>
        <h1 className="project-detail-title">{project.title || "Título del proyecto"}</h1>
      </header>

      <figure className="project-detail-image">
        <ProjectCoverMedia project={project} variant="player" />
      </figure>

      <div className="project-detail-body">
        <p className="project-lead">
          {project.description || "La descripción del proyecto aparecerá aquí..."}
        </p>

        <div className="project-meta">
          <div className="meta-item">
            <span className="meta-label">Año</span>
            <span className="meta-value">{project.year || "—"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Rol</span>
            <span className="meta-value">Diseñadora</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Herramientas</span>
            <span className="meta-value">{tools}</span>
          </div>
        </div>

        {metrics.length > 0 && (
          <div className="project-metrics-section">
            <h3 className="metrics-title">Resultados</h3>
            <div className="metrics-grid">
              {metrics.map((m) => (
                <div key={m} className="metric-card">
                  <span className="metric-value">{m}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {gallery.length > 0 && (
          <div className="project-gallery-preview">
            <h3 className="metrics-title">Galería</h3>
            <div className="gallery-grid">
              {gallery.map((src, i) => (
                <div key={`${src}-${i}`} className="gallery-thumb">
                  <img src={getOptimizedImageUrl(src, 400)} alt={`Imagen ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {(project.visible === false) && (
          <p style={{ marginTop: "1.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
            Este proyecto está oculto y no se muestra en el sitio público.
          </p>
        )}
      </div>
    </article>
  );
}
