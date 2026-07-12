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
import SortableProjectItem from "../SortableProjectItem";
import ProjectLivePreview from "../ProjectLivePreview";

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
  gallery: [],
});

export default function AdminProjectsTab({ projects, onProjectsChange, migrationLoading, onMigrateProjects }: AdminProjectsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [form, setForm] = useState<Project>(blankProject());
  const draggingRef = useRef(false);

  const existingCategories = Array.from(
    new Set(projects.map((p) => p.category).filter((c): c is string => Boolean(c)))
  );

  const openCreate = () => {
    setEditing(null);
    setForm(blankProject());
    setIsModalOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setForm({ ...project, gallery: project.gallery ?? [] });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setFileName("");
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
      setFileName(file.name);
    } else {
      setFileName("");
    }
  };

  const handleGalleryFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingGallery(true);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadToCloudinary(f)));
      setForm((prev) => ({ ...prev, gallery: [...(prev.gallery ?? []), ...uploaded] }));
    } catch (err) {
      console.error(err);
      alert("Error subiendo imágenes de la galería");
    } finally {
      setUploadingGallery(false);
      e.target.value = "";
    }
  };

  const addGalleryUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setForm((prev) => ({ ...prev, gallery: [...(prev.gallery ?? []), trimmed] }));
  };

  const removeGalleryImage = (idx: number) => {
    setForm((prev) => ({ ...prev, gallery: (prev.gallery ?? []).filter((_, i) => i !== idx) }));
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
        <div className="admin-editor-overlay" onClick={closeModal}>
          <form className="admin-editor" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
            <div className="admin-editor-form">
              <div className="admin-editor-header">
                <div>
                  <h2>{editing ? "Editar proyecto" : "Nuevo proyecto"}</h2>
                  <p>
                    {editing ? "Modificá los datos del proyecto" : "Completá los datos para crear un nuevo proyecto"}
                  </p>
                </div>
                <div className="admin-editor-header-actions">
                  <button type="button" onClick={closeModal} className="admin-editor-cancel">Cancelar</button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="admin-editor-save"
                  >
                    {loading ? "Guardando..." : editing ? "Guardar cambios" : "Crear proyecto"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="admin-editor-close"
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="admin-editor-fields">
                <div className="admin-field-group">
                  <label className="admin-field-label" htmlFor="project-title">Título *</label>
                  <input
                    id="project-title"
                    placeholder="Ej: Marca personal Pola Mola"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    className="admin-field"
                  />
                </div>
                <div className="admin-field-group">
                  <label className="admin-field-label" htmlFor="project-slug">URL del proyecto *</label>
                  <input
                    id="project-slug"
                    placeholder="Ej: marca-personal-pola-mola"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    required
                    className="admin-field"
                  />
                  <p className="admin-field-help">Se genera solo si lo dejás vacío. Usá guiones y minúsculas.</p>
                </div>
                <div className="admin-field-row">
                  <div className="admin-field-col">
                    <label className="admin-field-label" htmlFor="project-category">Categoría *</label>
                    <input
                      id="project-category"
                      list="project-category-list"
                      placeholder="Ej: Branding"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      required
                      className="admin-field"
                    />
                  </div>
                  <div className="admin-field-col">
                    <label className="admin-field-label" htmlFor="project-year">Año *</label>
                    <input
                      id="project-year"
                      placeholder="Ej: 2025"
                      value={form.year}
                      onChange={(e) => setForm({ ...form, year: e.target.value })}
                      required
                      className="admin-field"
                    />
                  </div>
                </div>
                <p className="admin-field-help">
                  Se usa como filtro en el sitio público. Elegí una categoría existente o escribí una nueva.
                </p>
                <datalist id="project-category-list">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                <div className="admin-field-group">
                  <label className="admin-field-label" htmlFor="project-description">Descripción *</label>
                  <textarea
                    id="project-description"
                    placeholder="Contá de qué se trata el proyecto..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                    className="admin-field"
                    style={{ minHeight: "120px", resize: "vertical" }}
                  />
                </div>
                <div className="admin-field-group">
                  <label className="admin-field-label" htmlFor="project-metrics">Métricas (opcional)</label>
                  <input
                    id="project-metrics"
                    placeholder="Ej: +40% conversión, 12k alcance"
                    value={Array.isArray(form.metrics) ? form.metrics.join(", ") : form.metrics || ""}
                    onChange={(e) => setForm({ ...form, metrics: e.target.value })}
                    className="admin-field"
                  />
                  <p className="admin-field-help">Separalas con coma. Cada una se muestra como una tarjeta de resultado.</p>
                </div>
                <div className="admin-field-group">
                  <label className="admin-field-label" htmlFor="project-size">Tamaño en la portada</label>
                  <select
                    id="project-size"
                    value={form.size || "medium"}
                    onChange={(e) => setForm({ ...form, size: e.target.value as Project["size"] })}
                    className="admin-field admin-select"
                  >
                    <option value="large">Destacado (grande)</option>
                    <option value="medium">Mediano</option>
                    <option value="small">Pequeño</option>
                  </select>
                  <p className="admin-field-help">Define cuánto espacio ocupa la tarjeta en la portada pública.</p>
                </div>

                <div className="admin-field-group">
                  <label className="admin-field-label">Imagen principal del proyecto</label>
                  <input
                    id="project-image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <label htmlFor="project-image" className="admin-gallery-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    {fileName ? `Cambiar imagen (${fileName})` : "Seleccionar imagen"}
                  </label>
                  <input
                    placeholder="O pegá una URL directamente"
                    value={form.image}
                    onChange={(e) => { setForm({ ...form, image: e.target.value }); setFileName(""); }}
                    className="admin-field"
                  />
                </div>

                <div className="admin-field-group">
                  <div className="admin-gallery-head">
                    <label className="admin-field-label">Galería de imágenes</label>
                    <span className="admin-gallery-count">{(form.gallery ?? []).length} imágenes</span>
                  </div>
                  {(form.gallery ?? []).length > 0 && (
                    <div className="admin-gallery-grid">
                      {(form.gallery ?? []).map((src, i) => (
                        <div key={`${src}-${i}`} className="admin-gallery-item">
                          <img src={src} alt={`Imagen ${i + 1}`} />
                          <button
                            type="button"
                            className="admin-gallery-remove"
                            aria-label="Quitar imagen"
                            onClick={() => removeGalleryImage(i)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="admin-gallery-actions">
                    <label htmlFor="gallery-images" className="admin-gallery-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Subir imágenes
                    </label>
                    <input
                      id="gallery-images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryFiles}
                      style={{ display: "none" }}
                    />
                    <input
                      className="admin-gallery-url"
                      placeholder="O pegá una URL y Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value;
                          addGalleryUrl(val);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                  </div>
                  {uploadingGallery && <p className="admin-gallery-hint">Subiendo imágenes...</p>}
                </div>
              </div>
            </div>

            <div className="admin-editor-preview">
              <div className="admin-editor-preview-bar">
                <span>Vista previa (público)</span>
              </div>
              <div className="admin-editor-preview-scroll">
                <ProjectLivePreview project={form} />
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
