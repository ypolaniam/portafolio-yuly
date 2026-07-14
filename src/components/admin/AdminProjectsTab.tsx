import { useEffect, useRef, useState } from "react";
import type { Project, ProjectVideo, VideoSource } from "../../types/project";
import { parseYouTubeId, getCloudinaryVideoUrl, getYouTubeEmbedUrl } from "../../lib/cloudinary";
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
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  video: undefined,
});

export default function AdminProjectsTab({ projects, onProjectsChange, migrationLoading, onMigrateProjects }: AdminProjectsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [form, setForm] = useState<Project>(blankProject());
  const draggingRef = useRef(false);

  // Cover type: "image" keeps the static `image`; "video" uses `form.video`.
  const [coverType, setCoverType] = useState<"image" | "video">("image");
  const [videoSource, setVideoSource] = useState<VideoSource>("cloudinary");
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoFileName, setVideoFileName] = useState<string>("");
  const [youTubeUrl, setYouTubeUrl] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [segStart, setSegStart] = useState<number>(0);
  const [segEnd, setSegEnd] = useState<number>(0);
  const [testingLoop, setTestingLoop] = useState(false);

  const existingCategories = Array.from(
    new Set(projects.map((p) => p.category).filter((c): c is string => Boolean(c)))
  );

  const openCreate = () => {
    setEditing(null);
    setForm(blankProject());
    setCoverType("image");
    setVideoSource("cloudinary");
    setVideoFileName("");
    setYouTubeUrl("");
    setVideoDuration(0);
    setSegStart(0);
    setSegEnd(0);
    setTestingLoop(false);
    setIsModalOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setForm({ ...project, gallery: project.gallery ?? [] });
    const hasVideo = Boolean(project.video?.url);
    setCoverType(hasVideo ? "video" : "image");
    setVideoSource(project.video?.source ?? "cloudinary");
    setVideoFileName("");
    setYouTubeUrl(project.video?.source === "youtube" ? project.video.url : "");
    setVideoDuration(0);
    if (hasVideo) {
      setSegStart(project.video?.start ?? 0);
      const total = project.video?.duration ?? 0;
      setSegEnd((project.video?.start ?? 0) + total);
    } else {
      setSegStart(0);
      setSegEnd(0);
    }
    setTestingLoop(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setFileName("");
    setVideoFileName("");
    setYouTubeUrl("");
    setTestingLoop(false);
  };

  const applySegment = (start: number, end: number) => {
    setForm((prev) => ({
      ...prev,
      video: prev.video
        ? {
            ...prev.video,
            start: Math.max(0, Math.round(start)),
            duration: Math.max(1, Math.round(end - start)),
          }
        : prev.video,
    }));
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
        video: { source: videoSource, url: videoSource === "youtube" ? youTubeUrl : "" },
      }));
    }
  };

  const handleVideoSourceChange = (source: VideoSource) => {
    setVideoSource(source);
    setForm((prev) => ({
      ...prev,
      video: prev.video ? { ...prev.video, source } : { source, url: source === "youtube" ? youTubeUrl : "" },
    }));
  };

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFileName(file.name);
    setVideoUploading(true);
    try {
      const url = await uploadToCloudinary(file, "video");
      setForm((prev) => ({
        ...prev,
        video: { source: "cloudinary", url, start: 0, duration: 0 },
      }));
      setSegStart(0);
      setSegEnd(0);
    } catch (err) {
      console.error(err);
      alert("Error subiendo el video a Cloudinary");
    } finally {
      setVideoUploading(false);
      e.target.value = "";
    }
  };

  const handleYouTubeChange = (value: string) => {
    setYouTubeUrl(value);
    const id = parseYouTubeId(value);
    setForm((prev) => ({
      ...prev,
      video: id ? { source: "youtube", url: value, start: 0, duration: 0 } : prev.video ? { ...prev.video, url: "" } : prev.video,
    }));
    setSegStart(0);
    setSegEnd(0);
  };

  const handlePreviewLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const dur = Math.floor(e.currentTarget.duration || 0);
    setVideoDuration(dur);
    setSegEnd((prev) => (prev > 0 && prev <= dur ? prev : dur));
  };

  const handleScrubberChange = (kind: "start" | "end", value: number) => {
    if (kind === "start") {
      const start = Math.min(value, segEnd);
      setSegStart(start);
      applySegment(start, segEnd);
    } else {
      const end = Math.max(value, segStart + 1);
      setSegEnd(end);
      applySegment(segStart, end);
    }
  };

  const handleUseFullVideo = () => {
    setSegStart(0);
    setSegEnd(videoDuration);
    applySegment(0, videoDuration);
  };

  const handleTestLoop = () => {
    setTestingLoop((prev) => !prev);
  };

  const uploadToCloudinary = async (file: File, resourceType: "image" | "video" = "image"): Promise<string> => {
    const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !preset) {
      alert("Falta configurar Cloudinary. Definí PUBLIC_CLOUDINARY_CLOUD_NAME y PUBLIC_CLOUDINARY_UPLOAD_PRESET en las variables de entorno.");
      throw new Error("Cloudinary no configurado");
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", preset);
    const res = await fetch(url, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Error subiendo archivo");
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

      let video = form.video;
      if (coverType === "video") {
        if (!video?.url) {
          alert("Subí un video a Cloudinary o pegá una URL de YouTube");
          setLoading(false);
          return;
        }
      } else {
        video = undefined;
      }

      const payload: Project = {
        ...form,
        image,
        video,
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
                <div className="admin-field-group">
                  <label className="admin-field-label" htmlFor="project-slug">URL del proyecto * <HelpTip text="Identificador en la dirección (ej: /trabajo/mi-proyecto). Se genera solo a partir del título si lo dejás vacío. Usá guiones y minúsculas." /></label>
                  <input
                    id="project-slug"
                    placeholder="Ej: marca-personal-pola-mola"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
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
                  <label className="admin-field-label" htmlFor="project-description">Descripción * <HelpTip text="Resumen principal del proyecto que aparece al abrirlo en el sitio público." /></label>
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
                  <label className="admin-field-label" htmlFor="project-metrics">Métricas (opcional) <HelpTip text="Logros cuantificables. Separados por coma; cada uno se muestra como una tarjeta de resultado en el detalle." /></label>
                  <input
                    id="project-metrics"
                    placeholder="Ej: +40% conversión, 12k alcance"
                    value={Array.isArray(form.metrics) ? form.metrics.join(", ") : form.metrics || ""}
                    onChange={(e) => setForm({ ...form, metrics: e.target.value })}
                    className="admin-field"
                  />
                </div>
                <div className="admin-field-group">
                  <label className="admin-field-label" htmlFor="project-size">Tamaño en la portada <HelpTip text="Cuánto espacio ocupa la tarjeta en la portada pública: grande (ancha), mediano o pequeño (estrecha)." /></label>
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
                </div>

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
                    onChange={(e) => { setForm({ ...form, image: e.target.value }); setFileName(""); }}
                    className="admin-field"
                  />
                </div>

                <div className="admin-field-group">
                  <label className="admin-field-label">Portada del proyecto <HelpTip text="Podés usar la imagen principal o un video de portada (Cloudinary o YouTube). La imagen sigue siendo el póster/fallback del video." /></label>
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
                      Video
                    </label>
                  </div>
                </div>

                {coverType === "video" && (
                  <div className="admin-field-group admin-video-block">
                    <div className="admin-radio-row">
                      <label className={`admin-radio ${videoSource === "cloudinary" ? "active" : ""}`}>
                        <input
                          type="radio"
                          name="video-source"
                          checked={videoSource === "cloudinary"}
                          onChange={() => handleVideoSourceChange("cloudinary")}
                        />
                        Subir a Cloudinary
                      </label>
                      <label className={`admin-radio ${videoSource === "youtube" ? "active" : ""}`}>
                        <input
                          type="radio"
                          name="video-source"
                          checked={videoSource === "youtube"}
                          onChange={() => handleVideoSourceChange("youtube")}
                        />
                        URL de YouTube
                      </label>
                    </div>

                    {videoSource === "cloudinary" ? (
                      <div>
                        <input
                          id="project-video"
                          type="file"
                          accept="video/*"
                          onChange={handleVideoFile}
                          style={{ display: "none" }}
                        />
                        <label htmlFor="project-video" className="admin-gallery-btn">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                          </svg>
                          {videoUploading ? "Subiendo video..." : videoFileName ? `Cambiar video (${videoFileName})` : "Seleccionar video"}
                        </label>
                        {form.video?.source === "cloudinary" && form.video.url && (
                          <input
                            placeholder="O pegá una URL directa de Cloudinary"
                            value={form.video.url}
                            onChange={(e) => setForm((prev) => ({ ...prev, video: prev.video ? { ...prev.video, url: e.target.value } : prev.video }))}
                            className="admin-field"
                          />
                        )}
                        {!form.video?.url && (
                          <p className="admin-gallery-hint">
                            El preset de Cloudinary debe permitir videos (resource_type video/auto).
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
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
                        {videoSource === "youtube" && (
                          <p className="admin-gallery-hint">
                            En la portada el video se reproduce en bucle desde el inicio (se ignora el recorte de duración).
                          </p>
                        )}
                      </div>
                    )}

                    {form.video?.url && (
                      <div className="admin-scrubber">
                        <div className="admin-scrubber-preview">
                          {form.video.source === "cloudinary" ? (
                            <video
                              src={getCloudinaryVideoUrl(form.video.url)}
                              poster={form.image || undefined}
                              controls
                              onLoadedMetadata={handlePreviewLoadedMetadata}
                              preload="metadata"
                            />
                          ) : (
                            <iframe
                              src={getYouTubeEmbedUrl(parseYouTubeId(form.video.url) ?? "")}
                              title="YouTube preview"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              frameBorder="0"
                            />
                          )}
                        </div>

                        <div className="admin-scrubber-controls">
                          {form.video.source === "cloudinary" ? (
                            <>
                              <div className="admin-scrubber-row">
                                <span className="admin-scrubber-label">Inicio</span>
                                <input
                                  type="range"
                                  min={0}
                                  max={Math.max(videoDuration, 1)}
                                  value={Math.min(segStart, videoDuration || segStart)}
                                  onChange={(e) => handleScrubberChange("start", Number(e.target.value))}
                                />
                                <span className="admin-scrubber-time">{formatTime(segStart)}</span>
                              </div>
                              <div className="admin-scrubber-row">
                                <span className="admin-scrubber-label">Fin</span>
                                <input
                                  type="range"
                                  min={0}
                                  max={Math.max(videoDuration, 1)}
                                  value={Math.min(segEnd, videoDuration || segEnd)}
                                  onChange={(e) => handleScrubberChange("end", Number(e.target.value))}
                                />
                                <span className="admin-scrubber-time">{formatTime(segEnd)}</span>
                              </div>
                              <div className="admin-scrubber-actions">
                                <button type="button" className="admin-gallery-btn" onClick={handleUseFullVideo}>
                                  Usar video completo
                                </button>
                                <button type="button" className="admin-gallery-btn" onClick={handleTestLoop}>
                                  {testingLoop ? "Detener prueba" : "Probar bucle"}
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="admin-scrubber-row">
                              <span className="admin-scrubber-label">Inicio</span>
                              <input
                                type="number"
                                min={0}
                                max={600}
                                value={form.video.start ?? 0}
                                onChange={(e) => setForm((prev) => ({ ...prev, video: prev.video ? { ...prev.video, start: Math.max(0, Number(e.target.value)) } : prev.video }))}
                                className="admin-field admin-scrubber-number"
                              />
                              <span className="admin-scrubber-time">seg</span>
                            </div>
                          )}
                        </div>

                        {testingLoop && form.video.source === "cloudinary" && (
                          <div className="admin-scrubber-test">
                            <video
                              src={getCloudinaryVideoUrl(form.video.url, { start: form.video.start, duration: form.video.duration })}
                              poster={form.image || undefined}
                              autoPlay
                              loop
                              muted
                              playsInline
                              preload="metadata"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="admin-field-group">
                  <div className="admin-gallery-head">
                    <label className="admin-field-label">Galería de imágenes <HelpTip text="Imágenes adicionales que se muestran en el detalle público con un visor ampliable (lightbox)." /></label>
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
