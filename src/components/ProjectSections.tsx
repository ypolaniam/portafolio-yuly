import type { ProjectSection } from "../types/project";
import { sanitizeHtml } from "../lib/html";
import { getOptimizedImageUrl, parseYouTubeId, getYouTubeEmbedUrl } from "../lib/cloudinary";

interface ProjectSectionsProps {
  sections?: ProjectSection[];
}

// Returns true when a section has enough data to be worth rendering.
function isRenderable(section: ProjectSection): boolean {
  if (section.type === "text") return Boolean(section.content && section.content.trim());
  if (section.type === "image") return Boolean(section.src && section.src.trim());
  if (section.type === "video") return Boolean(section.videoUrl && parseYouTubeId(section.videoUrl));
  return false;
}

export default function ProjectSections({ sections }: ProjectSectionsProps) {
  const renderable = (sections ?? []).filter(isRenderable);
  if (renderable.length === 0) return null;

  return (
    <div className="project-sections">
      {renderable.map((section) => {
        const className = `section section-${section.size} section-${section.type}`;

        if (section.type === "text") {
          return (
            <div key={section.id} className={className}>
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.content ?? "") }} />
            </div>
          );
        }

        if (section.type === "image") {
          return (
            <figure key={section.id} className={className}>
              <img
                src={getOptimizedImageUrl(section.src ?? "", 800)}
                alt={section.alt ?? ""}
                loading="lazy"
              />
              {section.caption && <figcaption className="section-caption">{section.caption}</figcaption>}
            </figure>
          );
        }

        // video
        const id = parseYouTubeId(section.videoUrl ?? "");
        if (!id) return null;
        return (
          <figure key={section.id} className={className}>
            <iframe
              src={getYouTubeEmbedUrl(id)}
              title={section.caption || "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              frameBorder="0"
            />
            {section.caption && <figcaption className="section-caption">{section.caption}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
}
