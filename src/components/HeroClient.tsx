import { useEffect, useRef, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Hero } from "../types/hero";
import { initialHero } from "../data/hero";
import { animate, scroll, inView } from "motion";
import { sanitizeHtml } from "../lib/html";

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

    const cleanups: (() => void)[] = [];

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
      const photo = section.querySelector(".hero-photo");
      const stats = section.querySelector(".hero-stats");
      const content = section.querySelector(".hero-inner");
      const grid = section.querySelector(".grid-overlay");
      const indicator = section.querySelector(".scroll-indicator");

      // On mobile the hero visual and photo are intentionally hidden via CSS.
      // The parallax below writes inline styles, which would override that media
      // query and make them show through behind the text. Skip it on small
      // screens and clear any inline styles so CSS keeps control of the hidden
      // state.
      const isDesktop = () => window.matchMedia("(min-width: 769px)").matches;

      if (visual) {
        scroll(
          (progress) => {
            if (!isDesktop()) {
              visual.style.opacity = "";
              visual.style.transform = "";
              if (content) {
                content.style.opacity = "";
                content.style.transform = "";
              }
              return;
            }

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

      if (photo) {
        // Calculate the photo's document-relative top by walking the
        // offsetParent chain. This is immune to CSS transforms (parallax,
        // sticky, etc.) so it stays stable as the page scrolls.
        const getDocumentTop = (el: HTMLElement) => {
          let top = 0;
          let current: HTMLElement | null = el;
          while (current) {
            top += current.offsetTop;
            current = current.offsetParent as HTMLElement | null;
          }
          return top;
        };

        let photoInitialTop = getDocumentTop(photo);
        let statsBottomInSection = section.offsetHeight;
        let currentTranslateY = 0;
        const img = photo.querySelector("img");

        const recalcInitial = () => {
          photoInitialTop = getDocumentTop(photo);
          if (stats) {
            const statsRect = stats.getBoundingClientRect();
            const sectionRect = section.getBoundingClientRect();
            statsBottomInSection = statsRect.bottom - sectionRect.top;
          } else {
            statsBottomInSection = section.offsetHeight;
          }
        };

        const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

        const computePhotoSticky = () => {
          const scrollY = window.scrollY;
          const sectionTop = section.offsetTop;
          const sectionHeight = section.offsetHeight;
          const photoHeight = photo.offsetHeight;
          const stickyOffset = window.innerHeight * 0.15;

          // The photo starts sticking when its natural top reaches stickyOffset
          // from the viewport top.
          const start = sectionTop + photoInitialTop - stickyOffset;
          // Stop the photo when its bottom would pass the stats text bottom
          // or the section bottom, whichever comes first.
          const statsEnd = sectionTop + statsBottomInSection - stickyOffset - photoHeight - 16;
          const sectionEnd = sectionTop + sectionHeight - stickyOffset - photoHeight;
          const end = Math.min(statsEnd, sectionEnd);

          let targetTranslateY = 0;
          if (scrollY >= start && scrollY <= end) {
            targetTranslateY = stickyOffset - (photoInitialTop - scrollY);
          } else if (scrollY < start) {
            targetTranslateY = 0;
          } else {
            // Past the limit: freeze the photo at the bottom boundary so it
            // never overlaps the stats text.
            targetTranslateY = stickyOffset - photoInitialTop + end;
          }

          // Smooth the movement with a lerp, but clamp so the photo never
          // exceeds its allowed range during the ease. 0.25 gives a nice
          // responsive-but-smooth follow effect.
          const minTranslate = 0;
          const maxTranslate = Math.max(0, stickyOffset - photoInitialTop + end);
          currentTranslateY = lerp(currentTranslateY, targetTranslateY, 0.25);
          currentTranslateY = Math.max(minTranslate, Math.min(currentTranslateY, maxTranslate));
          photo.style.transform = `translateY(${currentTranslateY}px)`;
        };

        const onScroll = () => {
          if (!isDesktop()) {
            photo.style.transform = "";
            currentTranslateY = 0;
            return;
          }
          window.requestAnimationFrame(computePhotoSticky);
        };

        const onResize = () => {
          if (!isDesktop()) {
            photo.style.transform = "";
            currentTranslateY = 0;
            return;
          }
          recalcInitial();
          computePhotoSticky();
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onResize);
        
        if (img && !img.complete) {
          img.addEventListener("load", () => {
            recalcInitial();
            computePhotoSticky();
          }, { once: true });
        }
        
        requestAnimationFrame(() => {
          recalcInitial();
          computePhotoSticky();
        });

        cleanups.push(() => {
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onResize);
          if (img) {
            img.removeEventListener("load", recalcInitial);
          }
          photo.style.transform = "";
          currentTranslateY = 0;
        });
      }

      if (grid) {
        scroll(
          (progress) => {
            if (!isDesktop()) {
              grid.style.opacity = "";
              grid.style.transform = "";
              return;
            }
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

      // Header reveal: looks like "Yuly Polanía" continues from the intro into
      // the navbar. (Ported from the original Hero.astro script, which was lost
      // when the home switched to this React client component.)
      const header = document.querySelector(".site-header");
      const logo = document.querySelector(".logo");
      const navLinks = document.querySelectorAll(".nav-link");

      if (header) {
        header.classList.add("header-visible");

        if (logo) {
          logo.style.opacity = "0";
          logo.style.transform = "translateY(-10px)";
          logo.style.filter = "blur(6px)";
          animate(
            logo,
            { opacity: [0, 1], y: [-10, 0], filter: ["blur(6px)", "blur(0px)"] },
            { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.4 }
          );
        }

        navLinks.forEach((link, i) => {
          link.style.opacity = "0";
          link.style.transform = "translateY(-8px)";
          animate(
            link,
            { opacity: [0, 1], y: [-8, 0] },
            { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.55 + i * 0.07 }
          );
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

    return () => {
      clearInterval(waitIntro);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <section ref={sectionRef} id="inicio" className="hero hero-loading" aria-label="Presentación">
      <div className="hero-visual">
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
            {hero.title.map((line, idx) => {
              const fontSize = hero.titleFontSizes?.[idx];
              return (
                <span key={idx} className="gradient-text" style={fontSize ? { fontSize: `${fontSize}rem` } : undefined}>
                  {line}
                  {idx < hero.title.length - 1 && <br />}
                </span>
              );
            })}
          </h1>

          <div className="hero-subtitle reveal-item" dangerouslySetInnerHTML={{ __html: sanitizeHtml(hero.subtitle) }} />

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
                <div className="stat-number-container">
                  {stat.prefix && <span className="stat-prefix">{stat.prefix}</span>}
                  <span className="stat-number" data-count={stat.value}>
                    0
                  </span>
                </div>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-photo">
          <img src={hero.photo} alt="Yuly Alejandra Polanía Molano" loading="eager" />
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
