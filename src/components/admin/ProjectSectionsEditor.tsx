import { useState, useRef } from "react";
import type { ProjectSection, SectionType, SectionSize } from "../../types/project";
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
  arrayMove,
} from "@dnd-kit/sortable";
import SortableSectionItem from "./SortableSectionItem";
import RichTextEditor from "./RichTextEditor";
import HelpTip from "./HelpTip";
import { parseYouTubeId, getYouTubeEmbedUrl } from "../../lib/cloudinary";

const COLORS = {
  bg: "#0A0A0F",
  surface: "#11101D",
  border: "#1E1D3A",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  primary: "#8B5CF6",
  primaryDark: "#7C3AED",
  white: "#FFFFFF",
  error: "#EF4444",
};

interface ProjectSectionsEditorProps {
  sections: ProjectSection[];
  onChange: (sections: ProjectSection[]) => void;
  uploadToCloudinary: (file: File) => Promise<string>;
  onShowSnackbar?: (message: string, type?: "success" | "error") => void;
}

export default function ProjectSectionsEditor({ sections, onChange, uploadToCloudinary, onShowSnackbar }: ProjectSectionsEditorProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const addSection = () => {
    onChange([
      ...sections,
      { id: crypto.randomUUID(), type: "text", size: "medium" },
    ]);
  };

  const updateSection = (id: string, patch: Partial<ProjectSection>) => {
    onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSection = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onChange(arrayMove(sections, oldIndex, newIndex));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, sectionId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(sectionId);
    setFileName((prev) => ({ ...prev, [sectionId]: file.name }));
    try {
      const url = await uploadToCloudinary(file);
      updateSection(sectionId, { src: url });
    } catch {
      onShowSnackbar?.("Error subiendo imagen de sección", "error");
    } finally {
      setUploadingId(null);
      e.target.value = "";
    }
  };

  const getSectionTitle = (section: ProjectSection): string => {
    const typeLabel = SECTION_TYPE_OPTIONS.find((o) => o.value === section.type)?.label ?? section.type;
    const sizeLabel = SECTION_SIZE_OPTIONS.find((o) => o.value === section.size)?.label ?? section.size;
    return `${typeLabel} · ${sizeLabel}`;
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
    <div className="section-editor">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <label className="admin-field-label" style={{ margin: 0 }}>
          Secciones del proyecto
          <HelpTip text="Bloques de contenido composicional que van después de la descripción. Usá texto, imágenes o videos y elegí el ancho de cada uno." />
        </label>
        <span style={{ fontSize: "0.75rem", color: COLORS.textMuted }}>
          {sections.length} sección{sections.length !== 1 ? "es" : ""}
        </span>
      </div>

      {sections.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={() => {}}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {}}
        >
          <SortableContext items={sections.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="section-editor-list">
              {sections.map((section) => {
                const isUploading = uploadingId === section.id;
                const typeInfo = SECTION_TYPE_OPTIONS.find((o) => o.value === section.type);

                return (
                  <SortableSectionItem key={section.id} section={section}>
                    {({ listeners, isDragging }) => (
                      <div className="section-editor-card">
                        <div className="section-editor-header">
                          <div className="section-editor-title">
                            <span
                              className="section-drag-handle"
                              title="Arrastrar para reordenar"
                              {...listeners}
                            >
                              ⋮⋮
                            </span>
                            <span className="section-type-icon" aria-hidden>
                              {typeInfo?.icon}
                            </span>
                            <span>{getSectionTitle(section)}</span>
                          </div>
                          <div className="section-editor-controls">
                            <select
                              value={section.type}
                              onChange={(e) => updateSection(section.id, { type: e.target.value as SectionType })}
                              className="admin-field admin-select"
                              style={{ width: "auto", minWidth: "140px" }}
                            >
                              {SECTION_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>

                            <select
                              value={section.size}
                              onChange={(e) => updateSection(section.id, { size: e.target.value as SectionSize })}
                              className="admin-field admin-select"
                              style={{ width: "auto", minWidth: "160px" }}
                            >
                              {SECTION_SIZE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => removeSection(section.id)}
                              className="section-editor-delete"
                              aria-label="Eliminar sección"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>

                        <div className="section-editor-body">
                          {section.type === "text" && (
                            <RichTextEditor
                              value={section.content || ""}
                              onChange={(html) => updateSection(section.id, { content: html })}
                              compact
                            />
                          )}

                          {section.type === "image" && (
                            <div className="section-editor-fields">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, section.id)}
                                style={{ display: "none" }}
                                id={`section-image-${section.id}`}
                              />
                              <label htmlFor={`section-image-${section.id}`} className="admin-gallery-btn" style={{ alignSelf: "flex-start" }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <polyline points="21 15 16 10 5 21" />
                                </svg>
                                {isUploading ? "Subiendo..." : fileName[section.id] ? `Cambiar imagen (${fileName[section.id]})` : "Seleccionar imagen"}
                              </label>
                              <input
                                placeholder="O pegá una URL directamente"
                                value={section.src || ""}
                                onChange={(e) => updateSection(section.id, { src: e.target.value })}
                                className="admin-field"
                              />
                              <input
                                placeholder="Texto alternativo (alt)"
                                value={section.alt || ""}
                                onChange={(e) => updateSection(section.id, { alt: e.target.value })}
                                className="admin-field"
                              />
                              {section.src && (
                                <div className="admin-gallery-item" style={{ maxWidth: "200px" }}>
                                  <img src={section.src} alt={section.alt || "Preview"} />
                                </div>
                              )}
                            </div>
                          )}

                          {section.type === "video" && (
                            <div className="section-editor-fields">
                              <input
                                placeholder="https://youtu.be/ID o https://youtube.com/watch?v=ID"
                                value={section.videoUrl || ""}
                                onChange={(e) => updateSection(section.id, { videoUrl: e.target.value })}
                                className="admin-field"
                              />
                              {section.videoUrl && !parseYouTubeId(section.videoUrl) && (
                                <p className="admin-gallery-hint" style={{ color: COLORS.error }}>URL de YouTube no válida.</p>
                              )}
                              {parseYouTubeId(section.videoUrl || "") && (
                                <div className="admin-scrubber-preview">
                                  <iframe
                                    src={getYouTubeEmbedUrl(parseYouTubeId(section.videoUrl || "") ?? "")}
                                    title="Preview video"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    frameBorder="0"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <input
                            placeholder="Caption opcional (imagen/video)"
                            value={section.caption || ""}
                            onChange={(e) => updateSection(section.id, { caption: e.target.value })}
                            className="admin-field"
                          />
                        </div>
                      </div>
                    )}
                  </SortableSectionItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <button
        type="button"
        onClick={addSection}
        className="section-editor-add-btn"
        style={{
          ...buttonSecondary,
          marginTop: "1rem",
          alignSelf: "flex-start",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = COLORS.primary;
          e.currentTarget.style.color = COLORS.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = COLORS.border;
          e.currentTarget.style.color = COLORS.text;
        }}
      >
        + Agregar sección
      </button>
    </div>
  );
}
