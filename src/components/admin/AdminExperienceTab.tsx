import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TimelineItem } from "../../types/timeline";
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
import { upsertTimelineItem, removeTimelineItem, migrateTimeline, reorderTimeline, setTimelineItemVisibility, getTimelineOnce } from "../../lib/timeline";
import SortableTimelineItem from "./SortableTimelineItem";
import RichTextEditor from "./RichTextEditor";

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

interface AdminExperienceTabProps {
  timeline: TimelineItem[];
  onTimelineChange: (timeline: TimelineItem[]) => void;
  migrationLoading: boolean;
  onMigrateTimeline: () => Promise<void>;
}

const blankItem = (): TimelineItem => ({
  id: "",
  type: "experience",
  title: "",
  institution: "",
  location: "",
  period: "",
  description: "",
  tags: [],
  href: "",
  visible: true,
});

export default function AdminExperienceTab({ timeline, onTimelineChange, migrationLoading, onMigrateTimeline }: AdminExperienceTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TimelineItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<TimelineItem>(blankItem());
  const draggingRef = useRef(false);

  const openCreate = () => {
    setEditing(null);
    setForm(blankItem());
    setIsModalOpen(true);
  };

  const openEdit = (item: TimelineItem) => {
    setEditing(item);
    setForm({ ...item });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: TimelineItem = {
        ...form,
        id: form.id || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        tags: form.tags?.filter(Boolean) ?? [],
      };

      await upsertTimelineItem(payload);
      const updated = await getTimelineOnce();
      onTimelineChange(updated);
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Error guardando item de experiencia");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este item?")) return;
    try {
      await removeTimelineItem(id);
      const updated = await getTimelineOnce();
      onTimelineChange(updated);
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el item");
    }
  };

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    onTimelineChange(timeline.map((i) => (i.id === id ? { ...i, visible } : i)));
    try {
      await setTimelineItemVisibility(id, visible);
    } catch (err) {
      console.error(err);
      alert("Error al cambiar la visibilidad");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    draggingRef.current = false;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = timeline.findIndex((i) => i.id === active.id);
    const newIndex = timeline.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(timeline, oldIndex, newIndex);
    onTimelineChange(next);
    try {
      await reorderTimeline(next);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el orden");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
          Experiencia
        </h2>
        <button
          type="button"
          onClick={onMigrateTimeline}
          disabled={migrationLoading}
          style={{
            ...buttonSecondary,
            opacity: migrationLoading ? 0.6 : 1,
          }}
          onMouseEnter={(e) => { if (!migrationLoading) { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.text; }}
        >
          {migrationLoading ? "Migrando..." : "Cargar experiencia inicial"}
        </button>
      </div>

      {timeline.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "4rem 2rem",
          background: "rgba(17, 16, 29, 0.4)",
          border: "1px dashed rgba(255,255,255,0.15)",
          borderRadius: "1.25rem",
          marginBottom: "2rem",
        }}>
          <p style={{ color: COLORS.textMuted, fontSize: "1rem", margin: 0 }}>
            No hay items de experiencia aún. Podés migrar los iniciales o crear uno nuevo con el botón +.
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
        <SortableContext items={timeline.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginBottom: "5rem",
          }}>
            {timeline.map((item) => (
              <SortableTimelineItem
                key={item.id}
                item={item}
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
        aria-label="Nuevo item de experiencia"
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

      {isModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            /* Rendered via portal on document.body so it escapes the
               #admin-scroll stacking context (root z-index 1) and sits above
               the fixed admin header (z-index 100). */
            zIndex: 2000,
          }} onClick={closeModal}>
            <form style={{
              background: `linear-gradient(180deg, ${COLORS.surface} 0%, ${COLORS.bg} 100%)`,
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "1.25rem",
              padding: "2rem",
              width: "100%",
              maxWidth: "min(92vw, 720px)",
              maxHeight: "82vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              color: COLORS.text,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }} onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: COLORS.white, letterSpacing: "-0.02em" }}>
                {editing ? "Editar experiencia" : "Nueva experiencia"}
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
              {editing ? "Modificá los datos de la experiencia" : "Completá los datos para crear una nueva experiencia"}
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
                placeholder="Institución *"
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
                required
                style={inputStyle}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <input
                  placeholder="Ubicación"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  style={inputStyle}
                />
                <input
                  placeholder="Periodo"
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <RichTextEditor
                compact
                value={form.description}
                onChange={(html) => setForm({ ...form, description: html })}
              />
              <input
                placeholder="Tags (separados por coma)"
                value={form.tags?.join(", ") || ""}
                onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                style={inputStyle}
              />
              <input
                placeholder="URL (opcional)"
                value={form.href}
                onChange={(e) => setForm({ ...form, href: e.target.value })}
                style={inputStyle}
              />
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: COLORS.textLight, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.visible ?? true}
                  onChange={(e) => setForm({ ...form, visible: e.target.checked })}
                />
                Visible en el sitio público
              </label>
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
                {loading ? "Guardando..." : editing ? "Guardar cambios" : "Crear experiencia"}
              </button>
            </div>
          </form>
          </div>,
          document.body
        )}
    </div>
  );
}
