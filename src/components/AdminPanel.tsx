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
import AdminBrandTab from "./admin/AdminBrandTab";
import Snackbar from "./admin/Snackbar";
import { migrateProjects } from "../lib/projects";
import { migrateHero } from "../lib/hero";
import { migrateAbout } from "../lib/about";
import { migrateTimeline } from "../lib/timeline";
import { migrateBrand } from "../lib/brand";
import type { Brand } from "../types/brand";

const DEFAULT_HERO: Hero = {
  overline: "",
  title: [""],
  subtitle: "",
  ctaPrimary: { label: "", href: "" },
  ctaSecondary: { label: "", href: "" },
  photo: "",
  stats: [],
};

const DEFAULT_BRAND: Brand = {
  name: "",
};

const DEFAULT_ABOUT: About = {
  title: "",
  image: "",
  intro: [""],
  values: [],
  skills: [],
  education: [],
};

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

type Tab = "hero" | "projects" | "about" | "experience" | "brand";

const TABS: { id: Tab; label: string }[] = [
  { id: "hero", label: "Inicio" },
  { id: "projects", label: "Proyectos" },
  { id: "about", label: "Sobre mí" },
  { id: "experience", label: "Experiencia" },
  { id: "brand", label: "Marca" },
];

export default function AdminPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("hero");
  const [authReady, setAuthReady] = useState(false);

  const [hero, setHero] = useState<Hero | null>(null);
  const [about, setAbout] = useState<About | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);

  const [migrationLoading, setMigrationLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showSnackbar = (message: string, type: "success" | "error" = "success") => {
    setSnackbar({ message, type });
  };

  const draggingRef = useRef(false);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
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
        brand?: Brand;
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
      if (data?.brand) setBrand(data.brand);
    }, (err) => {
      console.error("[AdminPanel] onSnapshot error:", err);
      showSnackbar("Error de sincronización con la base de datos", "error");
    });
    return () => unsub();
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showSnackbar("Inicio de sesión exitoso", "success");
    } catch (err) {
      console.error(err);
      showSnackbar("Error al iniciar sesión", "error");
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    showSnackbar("Sesión cerrada correctamente", "success");
    setEmail("");
    setPassword("");
    setShowPassword(false);
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
      showSnackbar(
        count > 0
          ? `Se agregaron ${count} ${label} iniciales (los existentes se conservan).`
          : `Los ${label} iniciales ya están cargados.`
      );
    } catch (e) {
      console.error(e);
      showSnackbar("Error en migración", "error");
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

  if (!authReady) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `${COLORS.bg}`,
        color: COLORS.textMuted,
        fontSize: "0.875rem",
      }}>
        Cargando...
      </div>
    );
  }

  return (
    <>
      {authReady && !user && (
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
          <form onSubmit={handleLogin} action="#" method="POST" style={{
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
              name="email"
              autoComplete="email"
              inputMode="email"
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
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.875rem 2.75rem 0.875rem 1rem",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "0.75rem",
                  background: "rgba(10,10,15,0.6)",
                  color: COLORS.text,
                  fontSize: "0.9375rem",
                  outline: "none",
                  transition: "all 0.2s ease",
                  boxSizing: "border-box",
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
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: COLORS.textMuted,
                  cursor: "pointer",
                  padding: "0.25rem",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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
      )}
      {authReady && user && (
        <div id="admin-scroll" style={{
          position: "fixed",
          top: "var(--header-height)",
          left: 0,
          right: 0,
          bottom: 0,
          overflowX: "hidden",
          overflowY: "auto",
          background: `${COLORS.bg}`,
          color: COLORS.text,
          zIndex: 1,
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

          <div style={{ width: "100%", padding: "2.5rem", position: "relative", zIndex: 1 }}>
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
                hero={hero ?? DEFAULT_HERO}
                onHeroChange={setHero}
                migrationLoading={migrationLoading}
                onMigrateHero={() => runMigration(migrateHero, "datos de Inicio")}
                onShowSnackbar={showSnackbar}
              />
            )}

            {activeTab === "about" && (
              <AdminAboutTab
                about={about ?? DEFAULT_ABOUT}
                onAboutChange={setAbout}
                migrationLoading={migrationLoading}
                onMigrateAbout={() => runMigration(migrateAbout, "datos de Sobre mí")}
                onShowSnackbar={showSnackbar}
              />
            )}

            {activeTab === "experience" && (
              <AdminExperienceTab
                timeline={timeline}
                onTimelineChange={setTimeline}
                migrationLoading={migrationLoading}
                onMigrateTimeline={() => runMigration(migrateTimeline, "items de Experiencia")}
                onShowSnackbar={showSnackbar}
              />
            )}

            {activeTab === "projects" && (
              <AdminProjectsTab
                projects={projects}
                onProjectsChange={setProjects}
                migrationLoading={migrationLoading}
                onMigrateProjects={() => runMigration(migrateProjects, "proyectos")}
                onShowSnackbar={showSnackbar}
              />
            )}

            {activeTab === "brand" && (
              <AdminBrandTab
                brand={brand ?? DEFAULT_BRAND}
                onBrandChange={setBrand}
                migrationLoading={migrationLoading}
                onMigrateBrand={() => runMigration(migrateBrand, "marca")}
                onShowSnackbar={showSnackbar}
              />
            )}
          </div>
        </div>
      )}
      <Snackbar
        open={!!snackbar}
        message={snackbar?.message ?? ""}
        type={snackbar?.type ?? "success"}
        onClose={() => setSnackbar(null)}
      />
    </>
  );
}
