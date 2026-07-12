import { useEffect, useRef, useState } from "react";
import type { Project } from "../../types/project";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { upsertProject, removeProject, reorderProjects, setProjectVisibility, getProjectsOnce } from "../../lib/projects";
import { getOptimizedImageUrl } from "../../lib/cloudinary";
import SortableProjectItem from "../SortableProjectItem";

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

interface AdminProjectsTabProps {
  projects: Project[];
  onProjectsChange: (projects: Project[]) => void;
  migrationLoading: boolean;
  onMigrateProjects: () => Promise<void>;
}

const blankProject = (): Project => ({
  slug: "",
  title: "",
  category: "",
  image: "",
  description: "",
  metrics: "",
  tools: [],
  year: new Date().getFullYear().toString(),
  size: "medium",
  visible: true,
});

export default function AdminProjectsTab({ projects, onProjectsChange, migrationLoading, onMigrateProjects }: AdminProjectsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState<Project>(blankProject());
  const draggingRef = useRef(false);

  const openCreate = () => {
    setEditing(null);
    setForm(blankProject());
    setIsModalOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setForm({ ...project });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setPreviewUrl(null);
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !preset) {
      alert("Falta configurar Cloudinary. Definí PUBLIC_CLOUDINARY_CLOUD_NAME y PUBLIC_CLOUDINARY_UPLOAD_PRESET en las variables de entorno.");
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
      const fileInput = document.getElementById("project-image") as HTMLInputElement | null;
      let image = form.image;

      if (fileInput?.files?.[0]) {
        image = await uploadToCloudinary(fileInput.files[0]);
      }
      if (!image) {
        alert("La imagen es requerida");
        setLoading(false);
        return;
      }

      const payload: Project = {
        ...form,
        image,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      };

      await upsertProject(payload);
      const updated = await getProjectsOnce();
      onProjectsChange(updated);
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Error guardando proyecto");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("¿Eliminar este proyecto?")) return;
    try {
      await removeProject(slug);
      const updated = await getProjectsOnce();
      onProjectsChange(updated);
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el proyecto");
    }
  };

  const handleToggleVisibility = async (slug: string, visible: boolean) => {
    onProjectsChange(projects.map((p) => (p.slug === slug ? { ...p, visible } : p)));
    try {
      await setProjectVisibility(slug, visible);
    } catch (err) {
      console.error(err);
      alert("Error al cambiar la visibilidad");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    draggingRef.current = false;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex((p) => p.slug === active.id);
    const newIndex = projects.findIndex((p) => p.slug === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(projects, oldIndex, newIndex);
    onProjectsChange(next);
    try {
      await reorderProjects(next);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el orden");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const formStyle: React.CSSProperties = {
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
          Proyectos
        </h2>
        <button
          type="button"
          onClick={onMigrateProjects}
          disabled={migrationLoading}
          style={{
            ...buttonSecondary,
            opacity: migrationLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!migrationLoading) { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.text; }}
        >
          {migrationLoading ? "Migrando..." : "Cargar proyectos iniciales"}
        </button>
      </div>

      {projects.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "4rem 2rem",
          background: "rgba(17, 16, 29, 0.4)",
          border: "1px dashed rgba(255,255,255,0.15)",
          borderRadius: "1.25rem",
          marginBottom: "2rem",
        }}>
          <p style={{ color: COLORS.textMuted, fontSize: "1rem", margin: 0 }}>
            No hay proyectos aún. Podés migrar los iniciales o crear uno nuevo con el botón +.
          </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => { draggingRef.current = true; }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { draggingRef.current = false; }}
      >
        <SortableContext items={projects.map((p) => p.slug)} strategy={rectSortingStrategy}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginBottom: "5rem",
          }}>
            {projects.map((project) => (
              <SortableProjectItem
                key={project.slug}
                project={project}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={openCreate}
        aria-label="Nuevo proyecto"
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: "none",
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
          color: COLORS.white,
          fontSize: "1.75rem",
          lineHeight: 1,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(139,92,246,0.4)",
          zIndex: 50,
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(139,92,246,0.5)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(139,92,246,0.4)";
        }}
      >
        +
      </button>

      {isModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          zIndex: 100,
        }} onClick={closeModal}>
          <form style={{
            ...{ background: `linear-gradient(180deg, ${COLORS.surface} 0%, ${COLORS.bg} 100%)`, border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1.25rem", padding: "2.5rem", width: "100%", maxWidth: "960px", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", color: COLORS.text, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
            flexDirection: "row",
            gap: "2rem",
            overflow: "hidden",
          }} onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
            <div style={{ flex: "1 1 55%", display: "flex", flexDirection: "column", gap: "1.25rem", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: COLORS.white, letterSpacing: "-0.02em" }}>
                  {editing ? "Editar proyecto" : "Nuevo proyecto"}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: COLORS.textMuted,
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "0.5rem",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.white; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textMuted; e.currentTarget.style.background = "transparent"; }}
                >
                  ×
                </button>
              </div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: COLORS.textMuted }}>
                {editing ? "Modificá los datos del proyecto" : "Completá los datos para crear un nuevo proyecto"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <input
                  placeholder="Título *"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  style={inputStyle}
                />
                <input
                  placeholder="Slug (URL) *"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                  style={inputStyle}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <input
                    placeholder="Categoría *"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                    style={inputStyle}
                  />
                  <input
                    placeholder="Año *"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    required
                    style={inputStyle}
                  />
                </div>
                <textarea
                  placeholder="Descripción *"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
                />
                <input
                  placeholder="Métricas (opcional)"
                  value={form.metrics || ""}
                  onChange={(e) => setForm({ ...form, metrics: e.target.value })}
                  style={inputStyle}
                />
                <input
                  placeholder="Tamaño (large / medium / small)"
                  value={form.size || "medium"}
                  onChange={(e) => setForm({ ...form, size: e.target.value as Project["size"] })}
                  style={inputStyle}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: COLORS.textLight }}>Imagen del proyecto</label>
                  <input
                    id="project-image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ fontSize: "0.875rem", color: COLORS.textMuted }}
                  />
                  <input
                    placeholder="O pegá una URL directamente"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" onClick={closeModal} style={buttonSecondary}>Cancelar</button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...buttonPrimary,
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Guardando..." : editing ? "Guardar cambios" : "Crear proyecto"}
                </button>
              </div>
            </div>

            <div style={{
              flex: "0 0 45%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "1rem",
              padding: "1.5rem",
              border: "1px solid rgba(255,255,255,0.05)",
              minHeight: "300px",
            }}>
              {(previewUrl || form.image) ? (
                <>
                   <img
                     src={previewUrl || getOptimizedImageUrl(form.image)}
                     alt="Preview"
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: "400px",
                      objectFit: "cover",
                      borderRadius: "0.75rem",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                    }}
                  />
                  <p style={{ marginTop: "1rem", fontSize: "0.8125rem", color: COLORS.textMuted, textAlign: "center" }}>
                    {previewUrl ? "Vista previa de la imagen seleccionada" : "Imagen actual del proyecto"}
                  </p>
                </>
              ) : (
                <div style={{
                  width: "100%",
                  aspectRatio: "16 / 10",
                  borderRadius: "0.75rem",
                  border: "1px dashed rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: COLORS.textMuted,
                  fontSize: "0.875rem",
                  textAlign: "center",
                  padding: "1rem",
                }}>
                  <div>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 0.75rem", display: "block", opacity: 0.6 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    La imagen se mostrará aquí
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
