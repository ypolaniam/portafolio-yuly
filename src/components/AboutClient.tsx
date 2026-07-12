import { useEffect, useRef, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { About } from "../types/about";
import { initialAbout } from "../data/about";

export default function AboutClient() {
  const [about, setAbout] = useState<About>(initialAbout);

  useEffect(() => {
    if (!db) {
      setAbout(initialAbout);
      return;
    }

    const unsub = onSnapshot(doc(db, "settings", "cache"), (snap) => {
      const data = (snap.data() as { about?: About } | undefined);
      console.log("[AboutClient] snapshot:", data?.about ? "has about" : "no about", snap.exists ? "doc exists" : "doc missing");
      if (data?.about) {
        setAbout(data.about);
      }
    }, (err) => {
      console.error("[AboutClient] onSnapshot error:", err);
    });
    return () => unsub();
  }, []);

  if (!about || !about.title) {
    return null;
  }

  return (
    <section id="sobre-mi" className="about" aria-labelledby="sobre-mi-title">
      <div className="about-inner">
        <header className="about-header">
          <p className="hero-overline reveal-text" data-reveal="word">
            Sobre mí
          </p>
          <h2 id="sobre-mi-title" className="section-title reveal">
            {about.title.split("propósito").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className="gradient-text">propósito</span>}
              </span>
            ))}
          </h2>
        </header>

        <div className="about-body">
          <div className="about-hero">
            <div className="about-image">
              <img src="https://placehold.co/600x800/8B5CF6/FFFFFF?text=Yuly" alt="Yuly Alejandra Polanía Molano" loading="lazy" />
            </div>
            <div className="about-intro">
              {about.intro.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="about-values">
            <h3 className="section-subtitle reveal-text" data-reveal="word">
              Mi trayectoria
            </h3>
            <div className="values-grid">
              {about.values.map((value) => (
                <article className="value-card" key={value.number}>
                  <span className="value-number reveal-text" data-reveal="word">
                    {value.number}
                  </span>
                  <h4 className="reveal-text" data-reveal="word">{value.title}</h4>
                  <p>{value.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="about-details">
            <div className="about-skills">
              <h3 className="skills-title reveal-text" data-reveal="word">
                Habilidades Técnicas
              </h3>
              <div className="skills-grid">
                {about.skills.map((skill) => (
                  <span className="skill-tag reveal-text" data-reveal="word" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="about-education">
              <h3 className="skills-title reveal-text" data-reveal="word">
                Formación
              </h3>
              <div className="education-grid">
                {about.education.map((edu, idx) => (
                  <article className="education-card" key={idx}>
                    <span className="education-year reveal-text" data-reveal="word">
                      {edu.year}
                    </span>
                    <h4 className="reveal-text" data-reveal="word">{edu.title}</h4>
                    <p>{edu.institution}</p>
                    <p className="education-detail">{edu.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
