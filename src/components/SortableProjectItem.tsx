import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Project } from "../types/project";
import ProjectCard from "./ProjectCard";

interface SortableProjectItemProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (slug: string) => void;
  onToggleVisibility: (slug: string, visible: boolean) => void;
}

// NOTE: hover transforms live on the INNER wrapper, never on the outer element.
// The outer element's `transform` is owned by dnd-kit (via useSortable) to animate
// the drag — writing to it (e.g. on hover) would break dragging.
export default function SortableProjectItem({ project, onEdit, onDelete, onToggleVisibility }: SortableProjectItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.slug,
  });

  const outerStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 5 : undefined,
    opacity: isDragging ? 0.85 : 1,
    // The dragging item should not shrink/grow while lifted.
    position: isDragging ? "relative" : undefined,
  };

  const innerStyle: React.CSSProperties = {
    background: "rgba(17, 16, 29, 0.5)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1rem",
    padding: "1.25rem",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
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
        <ProjectCard project={project} mode="edit" onEdit={onEdit} onDelete={onDelete} onToggleVisibility={onToggleVisibility} />
      </div>
    </div>
  );
}
