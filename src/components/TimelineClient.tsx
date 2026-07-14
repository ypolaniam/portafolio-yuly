import { useEffect, useRef, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { TimelineItem } from "../types/timeline";
import { initialTimeline } from "../data/timeline";
import { animate, inView, scroll } from "motion";

export default function TimelineClient() {
  const [timeline, setTimeline] = useState<TimelineItem[]>(initialTimeline);
  const sectionRef = useRef<HTMLElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!db) {
      setTimeline(initialTimeline);
      return;
    }

    const unsub = onSnapshot(doc(db, "settings", "cache"), (snap) => {
      const data = (snap.data() as { timeline?: TimelineItem[] } | undefined);
      console.log("[TimelineClient] snapshot:", data?.timeline ? `has ${data.timeline.length} items` : "no timeline", snap.exists ? "doc exists" : "doc missing");
      if (data?.timeline) {
        setTimeline(data.timeline);
      }
    }, (err) => {
      console.error("[TimelineClient] onSnapshot error:", err);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (animatedRef.current || !sectionRef.current) return;
    animatedRef.current = true;

    const section = sectionRef.current;
    const timelineLine = section.querySelector(".timeline-line");
    const timelineItems = section.querySelectorAll(".timeline-item");

    if (timelineLine) {
      scroll(
        (progress) => {
          // Keep the centering translateX(-50%) from CSS; only animate scaleY.
          timelineLine.style.transform = `translateX(-50%) scaleY(${progress})`;
        },
        { target: section, offset: ["start start", "end end"] }
      );
    }

    timelineItems.forEach((item) => {
      inView(
        item,
        () => {
          const dot = item.querySelector(".timeline-dot");
          const card = item.querySelector(".timeline-card");

          if (dot) {
            dot.classList.add("visible");
          }

          if (card) {
            animate(
              card,
              { opacity: [0, 1], y: [40, 0], scale: [0.96, 1] },
              { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }
            );
          }
        },
        { once: true, margin: "-80px" }
      );
    });
  }, [timeline]);

  const published = timeline.filter((item) => item.visible !== false);

  if (published.length === 0) {
    return null;
  }

  return (
    <section ref={sectionRef} id="trayectoria" className="timeline-section" aria-labelledby="timeline-title">
      <header className="timeline-header">
        <p className="hero-overline reveal-text" data-reveal="word">
          Trayectoria
        </p>
        <h2 id="timeline-title" className="section-title reveal">
          Experiencia <span className="gradient-text">profesional</span>
        </h2>
        <p className="section-description reveal-text" data-reveal="word">
          Un recorrido por mi trayectoria profesional.
        </p>
      </header>

      <div className="timeline">
        <div className="timeline-line" aria-hidden="true" />
        <div className="timeline-items">
          {published.map((item, index) => (
            <article
              className="timeline-item"
              data-reveal
              data-type={item.type}
              data-index={index}
              key={item.id}
            >
              <div className="timeline-dot" aria-hidden="true" />
              <div className="timeline-card reveal-item">
                <div className="timeline-card-header">
                  <div className="timeline-icon" aria-hidden="true">
                    {item.type === "experience" && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    )}
                  </div>
                  <div className="timeline-card-meta">
                    {item.period && <span className="timeline-period">{item.period}</span>}
                    {item.location && <span className="timeline-location">{item.location}</span>}
                  </div>
                </div>

                {item.title && <h3 className="timeline-title">{item.title}</h3>}
                {item.institution && <p className="timeline-institution">{item.institution}</p>}
                {item.description && <p className="timeline-description">{item.description}</p>}

                {item.tags && (
                  <div className="timeline-tags">
                    {item.tags.map((tag) => (
                      <span className="timeline-tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {item.href && (
                  <a href={item.href} target="_blank" rel="noopener" className="timeline-link">
                    Ver perfil →
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
