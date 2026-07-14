import { useEffect, useRef, useState } from "react";
import type { Project } from "../../types/project";
import { parseYouTubeId, getYouTubeEmbedUrl } from "../../lib/cloudinary";
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
import { stripHtml } from "../../lib/html";
import SortableProjectItem from "../SortableProjectItem";
import RichTextEditor from "./RichTextEditor";
import ProjectSectionsEditor from "./ProjectSectionsEditor";
import HelpTip from "./HelpTip";

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
  onShowSnackbar?: (message: string, type?: "success" | "error") => void;
}

const blankProject = (): Project => ({
  slug: "",
  title: "",
  category: "",
  image: "",
  description: "",
  metrics: [],
  tools: [],
  role: "Diseñadora",
  resultsDescription: "",
  year: new Date().getFullYear().toString(),
  size: "medium",
  visible: true,
  gallery: [],
  video: undefined,
  sections: [],
});

export default function AdminProjectsTab({ projects, onProjectsChange, migrationLoading, onMigrateProjects, onShowSnackbar }: AdminProjectsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [form, setForm] = useState<Project>(blankProject());
  const draggingRef = useRef(false);

  const hasProjectsData = projects.length > 0;

  // When the editor opens, reset the panel's scroll to the top so it doesn't
  // appear scrolled to the bottom (where the clicked item was in the list).
  useEffect(() => {
    if (isModalOpen) {
      const el = document.getElementById("admin-scroll");
      if (el) el.scrollTop = 0;
    }
  }, [isModalOpen]);

  // Cover type: "image" keeps the static `image`; "video" uses a YouTube URL in `form.video`.
  const [coverType, setCoverType] = useState<"image" | "video">("image");
  const [youTubeUrl, setYouTubeUrl] = useState<string>("");
  // Local object URL used to preview a cover image before it's uploaded.
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>("");

  const setCoverPreview = (url: string) => {
    setCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  // Raw text for comma-separated fields. We keep the text un-normalized while
  // the user types (so trailing commas and the caret are preserved) and only
  // split into the array at submit time.
  const [toolsText, setToolsText] = useState<string>("");
  const [metricsText, setMetricsText] = useState<string>("");

  const existingCategories = Array.from(
    new Set(projects.map((p) => p.category).filter((c): c is string => Boolean(c)))
  );

  const openCreate = () => {
    setEditing(null);
    setForm(blankProject());
    setCoverType("image");
    setYouTubeUrl("");
    setToolsText("");
    setMetricsText("");
    setShowConfirm(false);
    setCoverPreview("");
    setIsModalOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setForm({ ...project, gallery: project.gallery ?? [], sections: project.sections ?? [], role: project.role ?? "Diseñadora", resultsDescription: project.resultsDescription ?? "" });
    const hasVideo = Boolean(project.video?.url);
    setCoverType(project.coverType ?? (hasVideo ? "video" : "image"));
    setYouTubeUrl(project.video?.source === "youtube" ? project.video.url : "");
    setToolsText((project.tools ?? []).join(", "));
    setMetricsText(Array.isArray(project.metrics) ? project.metrics.join(", ") : (project.metrics ?? ""));
    setShowConfirm(false);
    setCoverPreview("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setShowConfirm(false);
    setEditing(null);
    setFileName("");
    setYouTubeUrl("");
    setCoverPreview("");
  };

  const handleCoverTypeChange = (type: "image" | "video") => {
    setCoverType(type);
    if (type === "image") {
      setForm((prev) => {
        const next = { ...prev };
        delete next.video;
        return next;
      });
    } else if (!form.video) {
      setForm((prev) => ({
        ...prev,
        video: { source: "youtube", url: youTubeUrl, start: 0, duration: 0 },
      }));
    }
  };

  const handleYouTubeChange = (value: string) => {
    setYouTubeUrl(value);
    const id = parseYouTubeId(value);
    setForm((prev) => ({
      ...prev,
      video: id ? { source: "youtube", url: value, start: 0, duration: 0 } : prev.video ? { ...prev.video, url: "" } : prev.video,
    }));
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    console.log("[cloudinary] iniciando subida:", { name: file.name, size: file.size, type: file.type, cloudName, preset });

    if (!cloudName || !preset) {
      onShowSnackbar?.("Falta configurar Cloudinary. Definí PUBLIC_CLOUDINARY_CLOUD_NAME y PUBLIC_CLOUDINARY_UPLOAD_PRESET en las variables de entorno.", "error");
      throw new Error("Cloudinary no configurado");
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", preset);
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[cloudinary] fallo subida:", res.status, text);
      throw new Error("Error subiendo archivo");
    }
    const data = await res.json();
    console.log("[cloudinary] subida OK, secure_url:", data.secure_url);
    return data.secure_url as string;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      if (!stripHtml(form.description).trim()) {
        onShowSnackbar?.("La descripción es requerida", "error");
        setLoading(false);
        return;
      }

      const fileInput = document.getElementById("project-image") as HTMLInputElement | null;
      let image = form.image;

      if (fileInput?.files?.[0]) {
        image = await uploadToCloudinary(fileInput.files[0]);
      }

      if (!image) {
        onShowSnackbar?.("La imagen es requerida", "error");
        setLoading(false);
        return;
      }

      let video = form.video;
      if (coverType === "video") {
        const ytId = parseYouTubeId(youTubeUrl);
        if (!ytId) {
          onShowSnackbar?.("Pegá una URL válida de YouTube para la portada en video", "error");
          setLoading(false);
          return;
        }
        video = { source: "youtube", url: youTubeUrl, start: 0, duration: 0 };
      } else {
        video = undefined;
      }

      const cleanedSections = (form.sections ?? []).filter((s) => {
        if (s.type === "text") return Boolean(stripHtml(s.content ?? "").trim());
        if (s.type === "image") return Boolean((s.src ?? "").trim());
        if (s.type === "video") return Boolean(parseYouTubeId(s.videoUrl ?? ""));
        return false;
      });
      const droppedSections = (form.sections ?? []).length - cleanedSections.length;
      if (droppedSections > 0) {
        onShowSnackbar?.(`Se omitieron ${droppedSections} sección(es) incompletas`, "error");
      }

      const payload: Project = {
        ...form,
        image,
        video,
        coverType,
        sections: cleanedSections,
        tools: toolsText.split(",").map((s) => s.trim()).filter(Boolean),
        metrics: metricsText.trim() ? metricsText.split(",").map((s) => s.trim()).filter(Boolean) : [],
        role: (form.role ?? "").trim() ? (form.role ?? "").trim() : undefined,
        resultsDescription: stripHtml(form.resultsDescription ?? "").trim()
          ? form.resultsDescription
          : undefined,
        slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      };

      await upsertProject(payload);
      const updated = await getProjectsOnce();
      onProjectsChange(updated);
      setShowConfirm(false);
      onShowSnackbar?.("Proyecto guardado correctamente");
    } catch (err) {
      console.error("[submit] error guardando proyecto:", err);
      onShowSnackbar?.("Error guardando proyecto", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("[cover] imagen seleccionada:", { name: file.name, size: file.size, type: file.type });
      setFileName(file.name);
      setCoverPreview(URL.createObjectURL(file));
    } else {
      console.log("[cover] ninguna imagen seleccionada");
      setFileName("");
      setCoverPreview("");
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
      onShowSnackbar?.("Error subiendo imágenes de la galería", "error");
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
      onShowSnackbar?.("Error al eliminar el proyecto", "error");
    }
  };

  const handleToggleVisibility = async (slug: string, visible: boolean) => {
    onProjectsChange(projects.map((p) => (p.slug === slug ? { ...p, visible } : p)));
    try {
      await setProjectVisibility(slug, visible);
    } catch (err) {
      console.error(err);
      onShowSnackbar?.("Error al cambiar la visibilidad", "error");
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
      onShowSnackbar?.("Error al guardar el orden", "error");
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
      {!isModalOpen && (
      <>
        <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "2rem",
      }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: COLORS.white }}>
          Proyectos
        </h2>
          {hasProjectsData ? null : (
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
          )}
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

      </>)}

      {isModalOpen && (
        <>
          <form className="admin-editor" onSubmit={(e) => { e.preventDefault(); setShowConfirm(true); }}>
            <div className="admin-editor-form">
              <div className="admin-editor-header">
                <div>
                  <h2>{editing ? "Editar proyecto" : "Nuevo proyecto"}</h2>
                  <p>
                    {editing ? "Modificá los datos del proyecto" : "Completá los datos para crear un nuevo proyecto"}
                  </p>
                </div>
              </div>

              <div className="admin-editor-fields">
                <div className="admin-field-group">
                  <label className="admin-field-label" htmlFor="project-title">Título * <HelpTip text="Nombre del proyecto que verán los visitantes en la portada y el detalle." /></label>
                  <input
                    id="project-title"
                    placeholder="Ej: Marca personal Pola Mola"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    className="admin-field"
                  />
                </div>
                <div className="admin-field-row">
                  <div className="admin-field-col">
                    <label className="admin-field-label" htmlFor="project-category">Categoría * <HelpTip text="Filtro que aparece en el sitio público. Elegí una categoría existente (se autocompleta) o escribí una nueva." /></label>
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
                    <label className="admin-field-label" htmlFor="project-year">Año * <HelpTip text="Año de realización del proyecto (se muestra en la ficha)." /></label>
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
                <datalist id="project-category-list">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>

                <div className="admin-field-group">
                  <label className="admin-field-label">Imagen principal del proyecto <HelpTip text="Foto destacada que se muestra al abrir el proyecto y en su tarjeta de la portada." /></label>
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
                    onChange={(e) => { setForm({ ...form, image: e.target.value }); setFileName(""); setCoverPreview(""); }}
                    className="admin-field"
                  />
                  {(coverPreviewUrl || form.image) && (
                    <div className="admin-cover-preview">
                      <img src={coverPreviewUrl || form.image} alt="Vista previa de la imagen principal" />
                      <span className="admin-cover-preview-label">Vista previa</span>
                    </div>
                  )}
                </div>

                <div className="admin-field-group">
                  <label className="admin-field-label">Portada del proyecto <HelpTip text="Elegí la imagen principal o un video de YouTube como portada. La imagen también se usa como póster del video." /></label>
                  <div className="admin-radio-row">
                    <label className={`admin-radio ${coverType === "image" ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="cover-type"
                        checked={coverType === "image"}
                        onChange={() => handleCoverTypeChange("image")}
                      />
                      Imagen
                    </label>
                    <label className={`admin-radio ${coverType === "video" ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="cover-type"
                        checked={coverType === "video"}
                        onChange={() => handleCoverTypeChange("video")}
                      />
                      Video (YouTube)
                    </label>
                  </div>
                </div>

                {coverType === "video" && (
                  <div className="admin-field-group admin-video-block">
                    <input
                      placeholder="https://youtu.be/ID o https://youtube.com/watch?v=ID"
                      value={youTubeUrl}
                      onChange={(e) => handleYouTubeChange(e.target.value)}
                      className="admin-field"
                    />
                    {youTubeUrl && !parseYouTubeId(youTubeUrl) && (
                      <p className="admin-gallery-hint" style={{ color: "#EF4444" }}>
                        URL de YouTube no válida.
                      </p>
                    )}
                    {parseYouTubeId(youTubeUrl) && (
                      <div className="admin-scrubber-preview">
                        <iframe
                          src={getYouTubeEmbedUrl(parseYouTubeId(youTubeUrl) ?? "")}
                          title="YouTube preview"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          frameBorder="0"
                        />
                      </div>
                    )}
                    <p className="admin-gallery-hint">
                      En la portada el video se reproduce en bucle. La imagen principal queda como póster.
                    </p>
                  </div>
                )}

                <div className="admin-field-group">
                  <label className="admin-field-label" htmlFor="project-description">Descripción * <HelpTip text="Resumen principal del proyecto que aparece al abrirlo en el sitio público. Podés usar negrita, subtítulos, listas y enlaces." /></label>
                  <RichTextEditor
                    value={form.description}
                    onChange={(html) => setForm({ ...form, description: html })}
                  />
                </div>
                <div className="admin-field-row">
                  <div className="admin-field-col">
                    <label className="admin-field-label" htmlFor="project-role">Rol (opcional) <HelpTip text="Rol que desempeñaste en el proyecto (se muestra en la ficha, antes de Resultados). Por defecto 'Diseñadora'." /></label>
                    <input
                      id="project-role"
                      placeholder="Ej: Diseñadora"
                      value={form.role || ""}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="admin-field"
                    />
                  </div>
                  <div className="admin-field-col">
                    <label className="admin-field-label" htmlFor="project-tools">Herramientas (opcional) <HelpTip text="Herramientas usadas, separadas por coma. Se muestran en la ficha del proyecto." /></label>
                    <input
                      id="project-tools"
                      placeholder="Ej: Figma, Photoshop, Illustrator"
                      value={toolsText}
                      onChange={(e) => setToolsText(e.target.value)}
                      className="admin-field"
                    />
                  </div>
                </div>
                <div className="admin-field-group">
                  <label className="admin-field-label">Descripción de Resultados (opcional) <HelpTip text="Texto que aparece bajo el título 'Resultados', antes de las tarjetas de métricas. Podés usar negrita, listas y enlaces." /></label>
                  <RichTextEditor
                    value={form.resultsDescription ?? ""}
                    onChange={(html) => setForm({ ...form, resultsDescription: html })}
                  />
                </div>
                <div className="admin-field-group">
                  <label className="admin-field-label" htmlFor="project-metrics">Métricas (opcional) <HelpTip text="Logros cuantificables. Separados por coma; cada uno se muestra como una tarjeta de resultado en el detalle." /></label>
                  <input
                    id="project-metrics"
                    placeholder="Ej: +40% conversión, 12k alcance"
                    value={metricsText}
                    onChange={(e) => setMetricsText(e.target.value)}
                    className="admin-field"
                  />
                </div>
                <div className="admin-field-group">
                  <label className="admin-field-label">Secciones del proyecto <HelpTip text="Bloques modulares (texto, imagen o video) que aparecen después de la descripción. Cada bloque tiene un tamaño (pequeño/mediano/grande) y se acomodan solos en una grilla. Podés reordenarlos arrastrando." /></label>
                  <ProjectSectionsEditor
                    sections={form.sections ?? []}
                    onChange={(next) => setForm({ ...form, sections: next })}
                    uploadToCloudinary={uploadToCloudinary}
                    onShowSnackbar={onShowSnackbar}
                  />
                </div>

                <div className="admin-field-group">
                  <label className="admin-field-label">Galería de imágenes <HelpTip text="Imágenes adicionales que se muestran en el detalle público con un visor ampliable (lightbox)." /></label>
                  <div className="admin-gallery-head">
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
                        <path d="M21 15v4a2 0 0 1-2 2H5a2 0 0 1-2-2v-4" />
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

            <div className="admin-editor-floating-actions">
              <button type="button" onClick={closeModal} className="admin-editor-cancel">Cancelar</button>
              <button
                type="submit"
                disabled={loading}
                className="admin-editor-save"
              >
                {loading ? "Guardando..." : editing ? "Guardar cambios" : "Crear proyecto"}
              </button>
            </div>
          </form>

          {showConfirm && (
            <div
              className="admin-confirm-overlay"
              onClick={() => !loading && setShowConfirm(false)}
            >
              <div className="admin-confirm" onClick={(e) => e.stopPropagation()}>
                <h3>¿Guardar cambios?</h3>
                <p>Se guardarán los datos del proyecto en Firebase. El editor quedará abierto para seguir editando.</p>
                <div className="admin-confirm-actions">
                  <button
                    type="button"
                    className="admin-editor-cancel"
                    onClick={() => setShowConfirm(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="admin-editor-save"
                    onClick={() => handleSubmit()}
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : "Confirmar y guardar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
