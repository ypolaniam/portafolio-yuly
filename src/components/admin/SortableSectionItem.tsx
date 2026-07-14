import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProjectSection } from "../../types/project";

interface SortableSectionItemProps {
  section: ProjectSection;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  children: (props: { listeners: ReturnType<typeof useSortable> extends { listeners: infer L } ? L : never; isDragging: boolean; collapsed: boolean; onToggleCollapse?: () => void }) => React.ReactNode;
}

export default function SortableSectionItem({ section, collapsed, onToggleCollapse, children }: SortableSectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const outerStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 5 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={outerStyle} {...attributes}>
      {children({ listeners, isDragging, collapsed: !!collapsed, onToggleCollapse })}
    </div>
  );
}
