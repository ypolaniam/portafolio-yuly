import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProjectSection } from "../../types/project";

interface SortableSectionItemProps {
  section: ProjectSection;
  children: (props: { listeners: ReturnType<typeof useSortable> extends { listeners: infer L } ? L : never; isDragging: boolean }) => React.ReactNode;
}

export default function SortableSectionItem({ section, children }: SortableSectionItemProps) {
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
      {children({ listeners, isDragging })}
    </div>
  );
}
