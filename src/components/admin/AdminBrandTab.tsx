import { useState } from "react";
import type { Brand } from "../../types/brand";
import { setBrand } from "../../lib/brand";

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
  error: "#EF4444",
};

interface AdminBrandTabProps {
  brand: Brand;
  onBrandChange: (brand: Brand) => void;
  migrationLoading: boolean;
  onMigrateBrand: () => Promise<void>;
  onShowSnackbar?: (message: string, type?: "success" | "error") => void;
}

export default function AdminBrandTab({ brand, onBrandChange, migrationLoading, onMigrateBrand, onShowSnackbar }: AdminBrandTabProps) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<Brand>({ ...brand });

  const hasBrandData = Boolean(brand.name.trim());

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      onShowSnackbar?.("El nombre de la marca es requerido", "error");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, name: form.name.trim() };
      await setBrand(payload);
      // Cache the name locally so the public site can render it before the
      // Firestore snapshot arrives (avoids a flash of the hardcoded default).
      try {
        if (typeof window !== "undefined") localStorage.setItem("yp_brand_name", payload.name);
      } catch {
        // ignore storage errors (private mode, quota, etc.)
      }
      onBrandChange(payload);
      onShowSnackbar?.("Marca guardada correctamente.");
    } catch (err) {
      console.error(err);
      onShowSnackbar?.("Error guardando la marca", "error");
    } finally {
      setLoading(false);
    }
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
          Marca
        </h2>
        {hasBrandData ? null : (
          <button
            type="button"
            onClick={onMigrateBrand}
            disabled={migrationLoading}
            style={{
              ...buttonSecondary,
              opacity: migrationLoading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { if (!migrationLoading) { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.text; }}
          >
            {migrationLoading ? "Migrando..." : "Cargar marca inicial"}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}>
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight, marginBottom: "0.5rem" }}>
            Nombre de la marca
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
            placeholder="Yuly Polanía"
            style={inputStyle}
          />
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", color: COLORS.textMuted }}>
            Aparece en la cabecera, la animación de intro y el pie de página del sitio público.
          </p>
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
