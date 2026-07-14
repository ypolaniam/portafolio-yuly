import { useEffect, useRef, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Project } from "../types/project";
import { initialProjects } from "../data/projects";
import ProjectCoverMedia from "./ProjectCoverMedia";

export default function ProjectsGridClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState("all");
  const rowsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Graceful fallback: if Firebase isn't configured (e.g. local dev without
    // .env), show the seed projects instead of crashing.
    if (!db) {
      console.warn("[projects] Firebase no configurado — mostrando proyectos semilla.");
      setProjects(initialProjects);
      return;
    }

    const unsub = onSnapshot(doc(db, "settings", "cache"), (snap) => {
      const data = (snap.data() as { projects?: Project[] } | undefined);
      setProjects(data?.projects ?? []);
    });
    return () => unsub();
  }, []);

  const categories = [...new Set(projects.map((p) => p.category))];
  // Hide projects flagged visible === false from the public site.
  const published = projects.filter((p) => p.visible !== false);
  const visible = filter === "all" ? published : published.filter((p) => p.category === filter);

  useEffect(() => {
    const cards = rowsRef.current?.querySelectorAll<HTMLDivElement>('.project-card[data-category]');
    if (!cards) return;

    cards.forEach((card, index) => {
      const show = filter === 'all' || card.dataset.category === filter;
      if (show) {
        card.classList.remove('hidden');
        (card as HTMLDivElement).style.animation = `none`;
        card.offsetHeight;
        (card as HTMLDivElement).style.animation = `fadeInUp 0.5s ${index * 0.05}s forwards`;
      } else {
        (card as HTMLDivElement).style.animation = `fadeOutUp 0.3s forwards`;
        setTimeout(() => card.classList.add('hidden'), 300);
      }
    });

    const rows = rowsRef.current?.querySelectorAll<HTMLDivElement>('.projects-row');
    rows?.forEach((row) => {
      const visibleCards = row.querySelectorAll('.project-card:not(.hidden)');
      visibleCards.forEach((card) => {
        card.classList.toggle('full-width', visibleCards.length === 1);
      });
    });
  }, [filter]);

  const rowFlex = (first?: Project, second?: Project, rowIndex = 0): [number, number] => {
    const fLarge = first?.size === "large";
    const sLarge = second?.size === "large";
    const fSmall = first?.size === "small";
    const sSmall = second?.size === "small";
    if (fLarge || sLarge) return fLarge ? [7, 3] : [3, 7];
    if (fSmall || sSmall) return fSmall ? [3, 7] : [7, 3];
    return rowIndex % 2 === 0 ? [7, 3] : [3, 7];
  };

  return (
    <section id="trabajo" className="work" aria-labelledby="trabajo-title">
      <div className="work-header">
        <p className="hero-overline reveal-text" data-reveal="word">Trabajo</p>
        <h2 id="trabajo-title" className="section-title reveal">
          Proyectos <span className="gradient-text">seleccionados</span>
        </h2>
        <p className="section-description reveal-text" data-reveal="word">
          Una selección de proyectos que combinan estrategia, diseño y resultados medibles.
        </p>
      </div>

      <div className="category-filter" role="tablist" aria-label="Filtrar por categoría">
        <button className={`filter-btn ${filter === "all" ? "active" : ""}`} data-filter="all" role="tab" aria-selected={filter === "all"} onClick={() => setFilter("all")}>Todos</button>
        {categories.map((cat) => (
          <button key={cat} className={`filter-btn ${filter === cat ? "active" : ""}`} data-filter={cat} role="tab" aria-selected={filter === cat} onClick={() => setFilter(cat)}>{cat}</button>
        ))}
      </div>

      <div className="projects-rows" ref={rowsRef}>
        {Array.from({ length: Math.ceil(visible.length / 2) }).map((_, rowIndex) => {
          const first = visible[rowIndex * 2];
          const second = visible[rowIndex * 2 + 1];
          const [firstFlex, secondFlex] = rowFlex(first, second, rowIndex);

          return (
            <div key={rowIndex} className="projects-row">
              {first && (
                <article className="project-card" data-category={first.category} style={{ flex: `${firstFlex} 1 0%` }}>
                  <a href={`/trabajo/${first.slug}/`} className="project-card-link" aria-label={`Ver detalle: ${first.title}`}>
                    <div className="project-card-image">
                      <ProjectCoverMedia project={first} variant="loop" />
                      <div className="project-card-overlay">
                        <span className="overlay-title">Ver proyecto →</span>
                        {first.metrics && <span className="overlay-metric">{typeof first.metrics === 'string' ? first.metrics : first.metrics[0]}</span>}
                      </div>
                      <span className="project-card-tag">{first.category}</span>
                    </div>
                    <div className="project-card-content">
                      <h3 className="project-title">{first.title}</h3>
                      {first.metrics && (
                        <div className="project-metrics">
                          {Array.isArray(first.metrics) ? first.metrics.map((m) => <span key={m} className="metric">{m}</span>) : <span className="metric">{first.metrics}</span>}
                        </div>
                      )}
                    </div>
                  </a>
                </article>
              )}
              {second && (
                <article className="project-card" data-category={second.category} style={{ flex: `${secondFlex} 1 0%` }}>
                  <a href={`/trabajo/${second.slug}/`} className="project-card-link" aria-label={`Ver detalle: ${second.title}`}>
                    <div className="project-card-image">
                      <ProjectCoverMedia project={second} variant="loop" />
                      <div className="project-card-overlay">
                        <span className="overlay-title">Ver proyecto →</span>
                        {second.metrics && <span className="overlay-metric">{typeof second.metrics === 'string' ? second.metrics : second.metrics[0]}</span>}
                      </div>
                      <span className="project-card-tag">{second.category}</span>
                    </div>
                    <div className="project-card-content">
                      <h3 className="project-title">{second.title}</h3>
                      {second.metrics && (
                        <div className="project-metrics">
                          {Array.isArray(second.metrics) ? second.metrics.map((m) => <span key={m} className="metric">{m}</span>) : <span className="metric">{second.metrics}</span>}
                        </div>
                      )}
                    </div>
                  </a>
                </article>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
