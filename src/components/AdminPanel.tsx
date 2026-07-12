import { useEffect, useRef, useState } from "react";
import {
  auth,
  db,
} from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import type { Project } from "../types/project";
import type { Hero } from "../types/hero";
import type { About } from "../types/about";
import type { TimelineItem } from "../types/timeline";
import AdminProjectsTab from "./admin/AdminProjectsTab";
import AdminHeroTab from "./admin/AdminHeroTab";
import AdminAboutTab from "./admin/AdminAboutTab";
import AdminExperienceTab from "./admin/AdminExperienceTab";
import { migrateProjects } from "../lib/projects";
import { migrateHero } from "../lib/hero";
import { migrateAbout } from "../lib/about";
import { migrateTimeline } from "../lib/timeline";

const COLORS = {
  bg: "#0A0A0F",
  surface: "#11101D",
  surfaceAlt: "#1E1B4B",
  border: "#1E1D3A",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  textLight: "#CBD5E1",
  primary: "#8B5CF6",
  primaryDark: "#7C3AED",
  white: "#FFFFFF",
};

type Tab = "hero" | "about" | "experience" | "projects";

const TABS: { id: Tab; label: string }[] = [
  { id: "hero", label: "Inicio" },
  { id: "about", label: "Sobre mí" },
  { id: "experience", label: "Experiencia" },
  { id: "projects", label: "Proyectos" },
];

export default function AdminPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("projects");

  const [hero, setHero] = useState<Hero | null>(null);
  const [about, setAbout] = useState<About | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [migrationLoading, setMigrationLoading] = useState(false);

  const draggingRef = useRef(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const settingsRef = doc(db, "settings", "cache");
    const unsub = onSnapshot(settingsRef, (snap) => {
      if (draggingRef.current) return;
      const data = (snap.data() as {
        hero?: Hero;
        about?: About;
        timeline?: TimelineItem[];
        projects?: Project[];
      } | undefined);
      console.log("[AdminPanel] snapshot:", {
        hero: !!data?.hero,
        about: !!data?.about,
        timeline: data?.timeline?.length ?? 0,
        projects: data?.projects?.length ?? 0,
      });
      if (data?.hero) setHero(data.hero);
      if (data?.about) setAbout(data.about);
      if (data?.timeline) setTimeline(data.timeline);
      if (data?.projects) setProjects(data.projects);
    }, (err) => {
      console.error("[AdminPanel] onSnapshot error:", err);
    });
    return () => unsub();
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      alert("Error al iniciar sesión");
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const logoutHandlerRef = useRef(handleLogout);

  useEffect(() => {
    const slot = document.getElementById("admin-layout-header-slot");
    if (!slot) return;

    slot.innerHTML = "";

    if (user) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "admin-layout-logout";
      btn.title = "Cerrar sesión";
      btn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span>Cerrar sesión</span>';
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await logoutHandlerRef.current();
      });
      slot.appendChild(btn);
    }

    return () => {
      slot.innerHTML = "";
    };
  }, [user]);

  useEffect(() => {
    logoutHandlerRef.current = handleLogout;
  });

  const runMigration = async (fn: () => Promise<number | boolean>, label: string) => {
    setMigrationLoading(true);
    try {
      const result = await fn();
      console.log(`[AdminPanel] migration ${label}:`, result);
      const count = typeof result === "number" ? result : result ? 1 : 0;
      alert(
        count > 0
          ? `Se agregaron ${count} ${label} iniciales (los existentes se conservan).`
          : `Los ${label} iniciales ya están cargados.`
      );
    } catch (e) {
      console.error(e);
      alert("Error en migración");
    } finally {
      setMigrationLoading(false);
    }
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1.5rem 2rem",
    background: "rgba(17, 16, 29, 0.6)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1.25rem",
    marginBottom: "2.5rem",
    boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
  };

  if (!user) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        background: `radial-gradient(circle at 50% 50%, ${COLORS.surfaceAlt} 0%, ${COLORS.bg} 100%)`,
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)`,
          top: "-300px",
          right: "-200px",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(59,130,246,0.1), transparent 70%)`,
          bottom: "-200px",
          left: "-100px",
          pointerEvents: "none",
        }} />
        <form onSubmit={handleLogin} style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          width: "100%",
          maxWidth: "400px",
          padding: "2.5rem",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "1.25rem",
          background: "rgba(17, 16, 29, 0.7)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        }}>
          <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: COLORS.white, letterSpacing: "-0.02em" }}>Panel Admin</h1>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", color: COLORS.textMuted }}>Gestioná tus proyectos de forma privada</p>
          </div>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "0.875rem 1rem",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem",
              background: "rgba(10,10,15,0.6)",
              color: COLORS.text,
              fontSize: "0.9375rem",
              outline: "none",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = COLORS.primary;
              e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.08)";
              e.target.style.boxShadow = "none";
            }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: "0.875rem 1rem",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem",
              background: "rgba(10,10,15,0.6)",
              color: COLORS.text,
              fontSize: "0.9375rem",
              outline: "none",
              transition: "all 0.2s ease",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = COLORS.primary;
              e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.15)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.08)";
              e.target.style.boxShadow = "none";
            }}
          />
          <button type="submit" style={{
            padding: "0.875rem",
            borderRadius: "0.75rem",
            border: "none",
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            color: COLORS.white,
            fontWeight: 600,
            fontSize: "0.9375rem",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(139,92,246,0.25)",
            transition: "all 0.2s ease",
          }}>Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: `${COLORS.bg}`,
      color: COLORS.text,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        width: "800px",
        height: "800px",
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)`,
        top: "-400px",
        right: "-300px",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        width: "600px",
        height: "600px",
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)`,
        bottom: "-300px",
        left: "-200px",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2.5rem", position: "relative", zIndex: 1 }}>
        <div style={headerStyle}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: COLORS.white, letterSpacing: "-0.02em" }}>
              Panel Admin
            </h1>
            <span style={{ fontSize: "0.875rem", color: COLORS.textMuted, marginTop: "0.25rem", display: "block" }}>
              {user.email}
            </span>
          </div>
          <nav style={{ display: "flex", gap: "0.5rem", background: "rgba(10,10,15,0.4)", padding: "0.375rem", borderRadius: "0.75rem" }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: activeTab === tab.id ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})` : "transparent",
                  color: activeTab === tab.id ? COLORS.white : COLORS.textMuted,
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = COLORS.text;
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = COLORS.textMuted;
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "hero" && (
          <AdminHeroTab
            hero={hero ?? {
              overline: "",
              title: [""],
              subtitle: "",
              ctaPrimary: { label: "", href: "" },
              ctaSecondary: { label: "", href: "" },
              photo: "",
              stats: [],
            }}
            onHeroChange={setHero}
            migrationLoading={migrationLoading}
            onMigrateHero={() => runMigration(migrateHero, "datos de Inicio")}
          />
        )}

        {activeTab === "about" && (
          <AdminAboutTab
            about={about ?? {
              title: "",
              intro: [""],
              values: [],
              skills: [],
              education: [],
            }}
            onAboutChange={setAbout}
            migrationLoading={migrationLoading}
            onMigrateAbout={() => runMigration(migrateAbout, "datos de Sobre mí")}
          />
        )}

        {activeTab === "experience" && (
          <AdminExperienceTab
            timeline={timeline}
            onTimelineChange={setTimeline}
            migrationLoading={migrationLoading}
            onMigrateTimeline={() => runMigration(migrateTimeline, "items de Experiencia")}
          />
        )}

        {activeTab === "projects" && (
          <AdminProjectsTab
            projects={projects}
            onProjectsChange={setProjects}
            migrationLoading={migrationLoading}
            onMigrateProjects={() => runMigration(migrateProjects, "proyectos")}
          />
        )}
      </div>
    </div>
  );
}
