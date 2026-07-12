import { useEffect, useCallback } from "react";
import { getOptimizedImageUrl } from "../lib/cloudinary";

interface LightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

export default function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const go = useCallback(
    (dir: 1 | -1) => {
      const next = (index + dir + images.length) % images.length;
      onNavigate(next);
    },
    [index, images.length, onNavigate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose]);

  if (!images.length) return null;

  const current = images[index];

  return (
    <div
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Visor de imágenes"
      onClick={onClose}
    >
      <button className="lightbox-close" type="button" aria-label="Cerrar" onClick={onClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {images.length > 1 && (
        <button className="lightbox-nav lightbox-prev" type="button" aria-label="Anterior" onClick={(e) => { e.stopPropagation(); go(-1); }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
        <img className="lightbox-image" src={getOptimizedImageUrl(current, 1600)} alt={`Imagen ${index + 1} de ${images.length}`} />
        {images.length > 1 && (
          <figcaption className="lightbox-caption">
            {index + 1} / {images.length}
          </figcaption>
        )}
      </figure>

      {images.length > 1 && (
        <button className="lightbox-nav lightbox-next" type="button" aria-label="Siguiente" onClick={(e) => { e.stopPropagation(); go(1); }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
