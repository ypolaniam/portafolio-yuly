import { useEffect, useState } from "react";
import type { Hero } from "../../types/hero";
import { setHero } from "../../lib/hero";
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

interface AdminHeroTabProps {
  hero: Hero;
  onHeroChange: (hero: Hero) => void;
  migrationLoading: boolean;
  onMigrateHero: () => Promise<void>;
  onShowSnackbar?: (message: string, type?: "success" | "error") => void;
}

export default function AdminHeroTab({ hero, onHeroChange, migrationLoading, onMigrateHero, onShowSnackbar }: AdminHeroTabProps) {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const [form, setForm] = useState<Hero>({ ...hero });

  useEffect(() => {
    setForm({ ...hero });
  }, [hero]);

  const update = (patch: Partial<Hero>) => setForm((prev) => ({ ...prev, ...patch }));

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !preset) {
      onShowSnackbar?.("Falta configurar Cloudinary.", "error");
      throw new Error("Cloudinary no configurado");
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", preset);
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Error subiendo imagen");
    const data = await res.json();
    return data.secure_url as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!stripHtml(form.subtitle).trim()) {
        onShowSnackbar?.("El subtítulo es requerido", "error");
        setLoading(false);
        return;
      }

      let photo = form.photo;

      const fileInput = document.getElementById("hero-photo") as HTMLInputElement | null;
      if (fileInput?.files?.[0]) {
        photo = await uploadToCloudinary(fileInput.files[0]);
      }

      const payload = { ...form, photo };
      await setHero(payload);
      onHeroChange(payload);
      onShowSnackbar?.("Cambios de Inicio guardados correctamente.");
      setPreviewUrl(null);
      setFileName("");
    } catch (err) {
      console.error(err);
      onShowSnackbar?.("Error guardando datos de Inicio", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setFileName(file.name);
    } else {
      setPreviewUrl(null);
      setFileName("");
    }
  };

  const titleLines = form.title.join("\n").split("\n");

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
          Inicio (Hero)
        </h2>
        <button
          type="button"
          onClick={onMigrateHero}
          disabled={migrationLoading}
          style={{
            ...buttonSecondary,
            opacity: migrationLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!migrationLoading) { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.text; }}
        >
          {migrationLoading ? "Migrando..." : "Cargar hero inicial"}
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        maxWidth: "800px",
      }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
            Overline
          </label>
          <input
            value={form.overline}
            onChange={(e) => update({ overline: e.target.value })}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
            Título (una línea por entrada)
          </label>
          <textarea
            value={titleLines.join("\n")}
            onChange={(e) => update({ title: e.target.value.split("\n") })}
            required
            style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
            Subtítulo
          </label>
          <RichTextEditor
            compact
            value={form.subtitle}
            onChange={(html) => update({ subtitle: html })}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
              CTA Primaria - Label
            </label>
            <input
              value={form.ctaPrimary.label}
              onChange={(e) => update({ ctaPrimary: { ...form.ctaPrimary, label: e.target.value } })}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
              CTA Primaria - URL
            </label>
            <input
              value={form.ctaPrimary.href}
              onChange={(e) => update({ ctaPrimary: { ...form.ctaPrimary, href: e.target.value } })}
              required
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
              CTA Secundaria - Label
            </label>
            <input
              value={form.ctaSecondary.label}
              onChange={(e) => update({ ctaSecondary: { ...form.ctaSecondary, label: e.target.value } })}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
              CTA Secundaria - URL
            </label>
            <input
              value={form.ctaSecondary.href}
              onChange={(e) => update({ ctaSecondary: { ...form.ctaSecondary, href: e.target.value } })}
              required
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
            Foto principal
          </label>
          <input
            id="hero-photo"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <label
            htmlFor="hero-photo"
            style={{
              ...buttonSecondary,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {fileName ? `Cambiar imagen (${fileName})` : "Seleccionar imagen"}
          </label>
          <input
            value={form.photo}
            onChange={(e) => { update({ photo: e.target.value }); setPreviewUrl(null); setFileName(""); }}
            placeholder="O pegá una URL directamente"
            required
            style={{ ...inputStyle, marginTop: "0.75rem" }}
          />
          {(previewUrl || form.photo) && (
            <div style={{ marginTop: "1rem" }}>
              <img
                src={previewUrl || form.photo}
                alt="Preview"
                style={{
                  width: "120px",
                  height: "160px",
                  objectFit: "cover",
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
            </div>
          )}
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
            Stats (label y valor)
          </label>
          {form.stats.map((stat, idx) => (
            <div key={idx} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem", alignItems: "center" }}>
              <input
                value={stat.label}
                onChange={(e) => {
                  const next = [...form.stats];
                  next[idx] = { ...next[idx], label: e.target.value };
                  update({ stats: next });
                }}
                placeholder="Label"
                required
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="number"
                value={stat.value}
                onChange={(e) => {
                  const next = [...form.stats];
                  next[idx] = { ...next[idx], value: parseInt(e.target.value) || 0 };
                  update({ stats: next });
                }}
                placeholder="Valor"
                required
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => {
                  const next = form.stats.filter((_, i) => i !== idx);
                  update({ stats: next });
                }}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "0.5rem",
                  color: "#EF4444",
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update({ stats: [...form.stats, { label: "", value: 0 }] })}
            style={{
              ...buttonSecondary,
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
            }}
          >
            + Agregar stat
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
