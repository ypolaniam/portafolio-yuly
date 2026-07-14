import { useEffect, useState } from "react";
import type { About } from "../../types/about";
import { setAbout } from "../../lib/about";
import RichTextEditor from "./RichTextEditor";
import { stripHtml } from "../../lib/html";

const COLORS = {
  bg: "#0A0A0F",
  surface: "#11101D",
  border: "#1E1D3A",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  textLight: "#CBD5E1",
  primary: "#8B5CF6",
  primaryDark: "#7C3AED",
  white: "#FFFFFF",
};

interface AdminAboutTabProps {
  about: About;
  onAboutChange: (about: About) => void;
  migrationLoading: boolean;
  onMigrateAbout: () => Promise<void>;
  onShowSnackbar?: (message: string, type?: "success" | "error") => void;
}

export default function AdminAboutTab({ about, onAboutChange, migrationLoading, onMigrateAbout, onShowSnackbar }: AdminAboutTabProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<About>({ ...about });

  useEffect(() => {
    setForm({ ...about });
  }, [about]);

  const update = (patch: Partial<About>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const emptyParagraph = form.intro.findIndex((p) => !stripHtml(p).trim());
      if (emptyParagraph !== -1) {
        onShowSnackbar?.("Todos los párrafos de la introducción son requeridos", "error");
        setLoading(false);
        return;
      }

      const emptyValue = form.values.findIndex((v) => !stripHtml(v.description).trim());
      if (emptyValue !== -1) {
        onShowSnackbar?.("La descripción de cada valor es requerida", "error");
        setLoading(false);
        return;
      }

      const emptyEducation = form.education.findIndex((edu) => !stripHtml(edu.detail).trim());
      if (emptyEducation !== -1) {
        onShowSnackbar?.("El detalle de cada formación es requerido", "error");
        setLoading(false);
        return;
      }

      await setAbout(form);
      onAboutChange(form);
      onShowSnackbar?.("Datos de Sobre mí guardados correctamente");
    } catch (err) {
      console.error(err);
      onShowSnackbar?.("Error guardando datos de Sobre mí", "error");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "0.875rem 1rem",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.75rem",
    background: "rgba(10,10,15,0.6)",
    color: COLORS.text,
    fontSize: "0.9375rem",
    outline: "none",
    transition: "all 0.2s ease",
    width: "100%",
    boxSizing: "border-box",
  };

  const buttonPrimary: React.CSSProperties = {
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
  };

  const buttonSecondary: React.CSSProperties = {
    padding: "0.875rem",
    borderRadius: "0.75rem",
    border: `1px solid ${COLORS.border}`,
    background: "transparent",
    color: COLORS.text,
    fontWeight: 500,
    fontSize: "0.9375rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

  return (
    <div>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "2rem",
      }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: COLORS.white }}>
          Sobre mí
        </h2>
        <button
          type="button"
          onClick={onMigrateAbout}
          disabled={migrationLoading}
          style={{
            ...buttonSecondary,
            opacity: migrationLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!migrationLoading) { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.text; }}
        >
          {migrationLoading ? "Migrando..." : "Cargar about inicial"}
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        maxWidth: "800px",
      }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
            Título general
          </label>
          <input
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
            Introducción (párrafos)
          </label>
          {form.intro.map((paragraph, idx) => (
            <div key={idx} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
              <RichTextEditor
                value={paragraph}
                onChange={(html) => {
                  const next = [...form.intro];
                  next[idx] = html;
                  update({ intro: next });
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const next = form.intro.filter((_, i) => i !== idx);
                  update({ intro: next });
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "0.5rem",
                  color: "#EF4444",
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  alignSelf: "flex-start",
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update({ intro: [...form.intro, ""] })}
            style={{
              ...buttonSecondary,
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
            }}
          >
            + Agregar párrafo
          </button>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
            Valores (número, título, descripción)
          </label>
          {form.values.map((value, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem", padding: "1rem", background: "rgba(17, 16, 29, 0.4)", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <input
                  value={value.number}
                  onChange={(e) => {
                    const next = [...form.values];
                    next[idx] = { ...next[idx], number: e.target.value };
                    update({ values: next });
                  }}
                  placeholder="Número"
                  required
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  value={value.title}
                  onChange={(e) => {
                    const next = [...form.values];
                    next[idx] = { ...next[idx], title: e.target.value };
                    update({ values: next });
                  }}
                  placeholder="Título"
                  required
                  style={{ ...inputStyle, flex: 2 }}
                />
              </div>
              <RichTextEditor
                compact
                value={value.description}
                onChange={(html) => {
                  const next = [...form.values];
                  next[idx] = { ...next[idx], description: html };
                  update({ values: next });
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const next = form.values.filter((_, i) => i !== idx);
                  update({ values: next });
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "0.5rem",
                  color: "#EF4444",
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  alignSelf: "flex-end",
                }}
              >
                × Eliminar
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update({ values: [...form.values, { number: "", title: "", description: "" }] })}
            style={{
              ...buttonSecondary,
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
            }}
          >
            + Agregar valor
          </button>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
            Skills
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {form.skills.map((skill, idx) => (
              <span key={idx} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.75rem",
                background: "rgba(17, 16, 29, 0.6)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "1000px",
                fontSize: "0.8125rem",
                color: COLORS.textLight,
              }}>
                {skill}
                <button
                  type="button"
                  onClick={() => {
                    const next = form.skills.filter((_, i) => i !== idx);
                    update({ skills: next });
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: COLORS.textMuted,
                    cursor: "pointer",
                    fontSize: "1rem",
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <input
              value={form.skills.length > 0 ? "" : ""}
              onChange={(e) => {
                if (e.target.value && !form.skills.includes(e.target.value)) {
                  update({ skills: [...form.skills, e.target.value] });
                }
              }}
              placeholder="Nueva skill"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => {
                const input = document.querySelector('input[placeholder="Nueva skill"]') as HTMLInputElement | null;
                if (input?.value && !form.skills.includes(input.value)) {
                  update({ skills: [...form.skills, input.value] });
                  input.value = "";
                }
              }}
              style={{
                ...buttonSecondary,
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
              }}
            >
              Agregar
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
            Educación
          </label>
          {form.education.map((edu, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem", padding: "1rem", background: "rgba(17, 16, 29, 0.4)", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
                <input
                  value={edu.year}
                  onChange={(e) => {
                    const next = [...form.education];
                    next[idx] = { ...next[idx], year: e.target.value };
                    update({ education: next });
                  }}
                  placeholder="Año"
                  required
                  style={inputStyle}
                />
                <input
                  value={edu.title}
                  onChange={(e) => {
                    const next = [...form.education];
                    next[idx] = { ...next[idx], title: e.target.value };
                    update({ education: next });
                  }}
                  placeholder="Título"
                  required
                  style={inputStyle}
                />
              </div>
              <input
                value={edu.institution}
                onChange={(e) => {
                  const next = [...form.education];
                  next[idx] = { ...next[idx], institution: e.target.value };
                  update({ education: next });
                }}
                placeholder="Institución"
                required
                style={inputStyle}
              />
              <RichTextEditor
                compact
                value={edu.detail}
                onChange={(html) => {
                  const next = [...form.education];
                  next[idx] = { ...next[idx], detail: html };
                  update({ education: next });
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const next = form.education.filter((_, i) => i !== idx);
                  update({ education: next });
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "0.5rem",
                  color: "#EF4444",
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  alignSelf: "flex-end",
                }}
              >
                × Eliminar
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update({ education: [...form.education, { year: "", title: "", institution: "", detail: "" }] })}
            style={{
              ...buttonSecondary,
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
            }}
          >
            + Agregar educación
          </button>
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="submit" disabled={loading} style={{ ...buttonPrimary, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
