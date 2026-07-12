import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TimelineItem } from "../../types/timeline";

interface SortableTimelineItemProps {
  item: TimelineItem;
  onEdit: (item: TimelineItem) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
}

const COLORS = {
  bg: "#0A0A0F",
  surface: "#11101D",
  border: "#1E1D3A",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  primary: "#8B5CF6",
  primaryDark: "#7C3AED",
  white: "#FFFFFF",
};

export default function SortableTimelineItem({ item, onEdit, onDelete, onToggleVisibility }: SortableTimelineItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const outerStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 5 : undefined,
    opacity: isDragging ? 0.85 : 1,
    position: isDragging ? "relative" : undefined,
  };

  const innerStyle: React.CSSProperties = {
    background: "rgba(17, 16, 29, 0.5)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1rem",
    padding: "1.25rem",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  const isHidden = item.visible === false;

  const actionButtonStyle: React.CSSProperties = {
    width: "36px",
    height: "36px",
    borderRadius: "0.5rem",
    border: "1px solid rgba(255,255,255,0.3)",
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(8px)",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  };

  return (
    <div ref={setNodeRef} style={outerStyle} {...attributes} {...listeners}>
      <div
        style={innerStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)";
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(139,92,246,0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 600, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.title || "Sin título"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.8125rem", color: COLORS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.institution || "—"}
            </p>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: COLORS.textMuted }}>
              {item.period || ""}
            </p>
          </div>
          {isHidden && (
            <span style={{
              padding: "0.25rem 0.5rem",
              borderRadius: "0.5rem",
              background: "rgba(245,158,11,0.9)",
              color: "#1A1206",
              fontSize: "0.75rem",
              fontWeight: 600,
              flexShrink: 0,
            }}>
              Oculto
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button
            type="button"
            onClick={() => onToggleVisibility(item.id, isHidden)}
            aria-label={isHidden ? "Mostrar" : "Ocultar"}
            aria-pressed={!isHidden}
            style={{
              ...actionButtonStyle,
              background: isHidden ? "rgba(245,158,11,0.85)" : "rgba(0,0,0,0.45)",
              borderColor: isHidden ? "transparent" : "rgba(255,255,255,0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isHidden ? "#F59E0B" : "#8B5CF6";
              e.currentTarget.style.borderColor = "transparent";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isHidden ? "rgba(245,158,11,0.85)" : "rgba(0,0,0,0.45)";
              e.currentTarget.style.borderColor = isHidden ? "transparent" : "rgba(255,255,255,0.3)";
            }}
          >
            {isHidden ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            aria-label="Editar"
            style={actionButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#8B5CF6";
              e.currentTarget.style.borderColor = "transparent";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.45)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label="Eliminar"
            style={actionButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#EF4444";
              e.currentTarget.style.borderColor = "transparent";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.45)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
