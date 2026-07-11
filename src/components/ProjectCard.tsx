import { useEffect, useState } from "react";
import type { Project, CardMode } from "../types/project";
import { getOptimizedImageUrl } from "../lib/cloudinary";

export interface ProjectCardProps {
  project: Project;
  mode?: CardMode;
  onEdit?: (project: Project) => void;
  onDelete?: (slug: string) => void;
}

const FALLBACK_IMAGE = "https://placehold.co/800x500/8B5CF6/FFFFFF?text=Proyecto";

export default function ProjectCard({ project, mode = "display", onEdit, onDelete }: ProjectCardProps) {
  const [imgSrc, setImgSrc] = useState(() => getOptimizedImageUrl(project.image) || FALLBACK_IMAGE);

  useEffect(() => {
    setImgSrc(getOptimizedImageUrl(project.image) || FALLBACK_IMAGE);
  }, [project.image]);

  const sizeClass = project.size ?? "medium";

  const actionButtonStyle: React.CSSProperties = {
    width: "36px",
    height: "36px",
    borderRadius: "0.5rem",
    border: "1px solid rgba(255,255,255,0.3)",
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  };

  const cardInner = (
    <>
      <div className="project-card-image">
        <img
          src={imgSrc}
          alt={project.title}
          loading="lazy"
          onError={() => setImgSrc(FALLBACK_IMAGE)}
        />
        <div className="project-card-overlay">
          <span className="overlay-title">Ver proyecto →</span>
          {project.metrics ? (
            <span className="overlay-metric">
              {typeof project.metrics === "string" ? project.metrics : project.metrics[0]}
            </span>
          ) : null}
        </div>
        <span className="project-card-tag">{project.category}</span>
      </div>
      <div className="project-card-content">
        <h3 className="project-title">{project.title}</h3>
        {project.metrics ? (
          <div className="project-metrics">
            {Array.isArray(project.metrics) ? (
              project.metrics.map((m) => <span key={m} className="metric">{m}</span>)
            ) : (
              <span className="metric">{project.metrics}</span>
            )}
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <div className={`project-card ${sizeClass}`}>
      {mode === "display" ? (
        <a href={`/trabajo/${project.slug}/`} className="project-card-link" aria-label={`Ver proyecto ${project.title}`}>
          {cardInner}
        </a>
      ) : (
        <div className="project-card-link" aria-label={`Proyecto ${project.title}`}>
          {cardInner}
        </div>
      )}

      {mode === "edit" && (
        <div className="card-actions" style={{ position: "absolute", top: "0.75rem", right: "0.75rem", display: "flex", gap: "0.5rem", zIndex: 10 }}>
          <button
            type="button"
            onClick={() => onEdit?.(project)}
            aria-label="Editar"
            style={actionButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#8B5CF6";
              e.currentTarget.style.borderColor = "transparent";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.45)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(project.slug)}
            aria-label="Eliminar"
            style={actionButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#EF4444";
              e.currentTarget.style.borderColor = "transparent";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.45)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
