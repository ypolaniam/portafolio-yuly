import { useEffect, useRef, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Hero } from "../types/hero";
import { initialHero } from "../data/hero";
import { animate, scroll, inView } from "motion";

export default function HeroClient() {
  const [hero, setHero] = useState<Hero>(initialHero);
  const sectionRef = useRef<HTMLElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!db) {
      setHero(initialHero);
      return;
    }

    const unsub = onSnapshot(doc(db, "settings", "cache"), (snap) => {
      const data = (snap.data() as { hero?: Hero } | undefined);
      console.log("[HeroClient] snapshot:", data?.hero ? "has hero" : "no hero", snap.exists ? "doc exists" : "doc missing");
      if (data?.hero) {
        setHero(data.hero);
      }
    }, (err) => {
      console.error("[HeroClient] onSnapshot error:", err);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (animatedRef.current || !sectionRef.current) return;

    const bootAnimations = () => {
      if (animatedRef.current || !sectionRef.current) return;
      animatedRef.current = true;

      const section = sectionRef.current;
      section.classList.add("hero-visible");

      const revealItems = section.querySelectorAll(".reveal-item");
      revealItems.forEach((el, i) => {
        animate(el, { opacity: [0, 1], y: [30, 0] }, { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.12 + i * 0.07 });
      });

      const statNumbers = section.querySelectorAll(".stat-number[data-count]");
      statNumbers.forEach((el) => {
        const target = parseInt(el.dataset.count || "0");
        inView(
          el,
          () => {
            animate(0, target, {
              duration: 1.5,
              ease: "easeOut",
              onUpdate: (v) => {
                el.textContent = Math.round(v).toLocaleString();
              },
            });
          },
          { once: true, margin: "-100px" }
        );
      });

      const blobs = section.querySelectorAll(".blob");
      blobs.forEach((shape, i) => {
        animate(
          shape,
          { y: [0, -30, 0], x: [0, 20, 0], rotate: [0, 8, 0], scale: [1, 1.05, 1] },
          { duration: 8 + i * 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }
        );
      });

      const orbs = section.querySelectorAll(".orb");
      orbs.forEach((orb, i) => {
        animate(
          orb,
          { scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15], borderRadius: ["50%", "30% 70% 70% 30% / 30% 30% 70% 70%", "50%"] },
          { duration: 10 + i * 4, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 }
        );
      });

      const visual = section.querySelector(".hero-visual");
      const content = section.querySelector(".hero-inner");
      const grid = section.querySelector(".grid-overlay");
      const indicator = section.querySelector(".scroll-indicator");

      if (visual) {
        scroll(
          (progress) => {
            const y = progress * 150;
            const opacity = 1 - progress * 0.5;
            visual.style.transform = `translateY(${y}px)`;
            visual.style.opacity = String(opacity);

            if (content) {
              content.style.transform = `translateY(${progress * -30}px)`;
              content.style.opacity = String(1 - progress * 0.3);
            }
          },
          { target: section, offset: ["start start", "end start"] }
        );
      }

      if (grid) {
        scroll(
          (progress) => {
            grid.style.transform = `translateY(${progress * -100}px) rotate(${progress * 5}deg)`;
            grid.style.opacity = String(0.03 - progress * 0.02);
          },
          { target: section, offset: ["start start", "end start"] }
        );
      }

      if (indicator) {
        animate(indicator, { opacity: [0.4, 1, 0.4], y: [0, 10, 0] }, { duration: 2, repeat: Infinity, ease: "easeInOut" });

        scroll(
          (progress) => {
            indicator.style.opacity = String(1 - progress * 3);
          },
          { target: section, offset: ["start start", "100px start"] }
        );
      }

      section.querySelectorAll(".magnetic").forEach((btn) => {
        btn.addEventListener("mousemove", (e) => {
          const rect = btn.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });

        btn.addEventListener("mouseleave", () => {
          btn.style.transform = "translate(0, 0)";
          btn.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
        });
      });

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        section.querySelectorAll(".mesh-blob, .glass-panel").forEach((el) => {
          el.style.animation = "none";
        });
      }
    };

    // Wait for intro scene to finish (same behavior as original Hero.astro script).
    let introTries = 0;
    const waitIntro = setInterval(() => {
      const intro = document.querySelector(".intro-scene");
      if (!intro || introTries++ > 70) {
        clearInterval(waitIntro);
        bootAnimations();
      }
    }, 120);
  }, []);

  return (
    <section ref={sectionRef} className="hero hero-loading" aria-label="Presentación">
      <div className="hero-visual">
        <div className="hero-photo">
          <img src={hero.photo} alt="Yuly Alejandra Polanía Molano" loading="eager" />
        </div>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="grid-overlay" />
      </div>

      <div className="hero-inner">
        <div className="hero-content">
          <p className="hero-overline reveal-item">{hero.overline}</p>

          <h1 className="hero-title reveal-item">
            {hero.title.map((line, idx) => (
              <span key={idx} className="gradient-text">
                {line}
                {idx < hero.title.length - 1 && <br />}
              </span>
            ))}
          </h1>

          <p className="hero-subtitle reveal-item">{hero.subtitle}</p>

          <div className="hero-actions reveal-item">
            <a href={hero.ctaPrimary.href} className="btn-primary magnetic">
              {hero.ctaPrimary.label}
            </a>
            <a href={hero.ctaSecondary.href} className="btn-secondary magnetic">
              {hero.ctaSecondary.label}
            </a>
          </div>

          <div className="hero-stats reveal-item">
            {hero.stats.map((stat, idx) => (
              <div className="stat" key={idx}>
                <span className="stat-number" data-count={stat.value}>
                  0
                </span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="scroll-indicator" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
