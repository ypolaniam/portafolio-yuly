import { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface RichTextEditorProps {
  value: string;
  onChange?: (html: string) => void;
  compact?: boolean;
}

const COLORS = {
  bg: "#0A0A0F",
  surface: "#11101D",
  surfaceAlt: "#1E1B4B",
  border: "#1E1D3A",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  primary: "#8B5CF6",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Tiptap parses `content` as HTML. Legacy plain-text descriptions must be
// escaped so characters like <, >, & render literally instead of being
// interpreted as markup. If the value already contains HTML markup (produced
// by this editor), trust it as-is.
function prepareContent(value: string): string {
  if (!value) return "";
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  return escapeHtml(value);
}

interface ToolbarButtonProps {
  label: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
}

function ToolbarButton({ label, title, isActive, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        minWidth: "34px",
        height: "34px",
        padding: "0 0.5rem",
        borderRadius: "0.5rem",
        border: `1px solid ${isActive ? COLORS.primary : COLORS.border}`,
        background: isActive ? "rgba(139,92,246,0.18)" : "transparent",
        color: isActive ? COLORS.primary : COLORS.text,
        fontWeight: 600,
        fontSize: "0.875rem",
        cursor: "pointer",
        transition: "all 0.15s ease",
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}

// True when the HTML has no visible text content (only empty tags).
function isEmptyHtml(html: string): boolean {
  return !html.replace(/<[^>]*>/g, "").trim();
}

export default function RichTextEditor({ value, onChange, compact = false }: RichTextEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        },
      }),
    ],
    [],
  );

  // Forces a re-render on every editor transaction so the toolbar's
  // `isActive` state (bold/italic/heading/link, etc.) stays in sync.
  const [, forceUpdate] = useState(0);

  const editor = useEditor({
    extensions,
    content: prepareContent(value || ""),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-text-editor-content",
        style: `min-height: ${compact ? "90px" : "160px"}; padding: 1rem; outline: none; color: ${COLORS.text}; font-size: 0.9375rem; line-height: 1.7;`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(isEmptyHtml(html) ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const update = () => forceUpdate((n) => n + 1);
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);

  // Sync external `value` changes back into the editor. Tiptap only reads
  // `value` once at creation, so when the saved data arrives after mount
  // (or the parent resets the form) the editor would keep showing stale
  // content. We only push when it actually differs from what's on screen
  // to avoid clobbering the caret while the user is typing.
  useEffect(() => {
    if (!editor) return;
    const current = isEmptyHtml(editor.getHTML()) ? "" : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(prepareContent(value || ""));
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace (https://…)", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      className="rich-text-editor"
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: "0.75rem",
        background: COLORS.surface,
        overflow: "hidden",
      }}
    >
      <div
        className="rich-text-editor-toolbar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.375rem",
          padding: "0.625rem",
          borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.bg,
        }}
      >
        <ToolbarButton
          title="Negrita"
          label="B"
          isActive={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          title="Cursiva"
          label="I"
          isActive={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          title="Tachado"
          label="S"
          isActive={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        {!compact && (
          <span style={{ width: "1px", alignSelf: "stretch", background: COLORS.border, margin: "0 0.25rem" }} />
        )}
        {!compact && (
          <ToolbarButton
            title="Subtítulo (H2)"
            label="H2"
            isActive={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
        )}
        {!compact && (
          <ToolbarButton
            title="Subtítulo (H3)"
            label="H3"
            isActive={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          />
        )}
        {!compact && (
          <span style={{ width: "1px", alignSelf: "stretch", background: COLORS.border, margin: "0 0.25rem" }} />
        )}
        {!compact && (
          <ToolbarButton
            title="Lista con viñetas"
            label="•"
            isActive={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
        )}
        {!compact && (
          <ToolbarButton
            title="Lista numerada"
            label="1."
            isActive={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
        )}
        {!compact && (
          <ToolbarButton
            title="Cita"
            label="❝"
            isActive={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />
        )}
        <ToolbarButton
          title="Enlace"
          label="🔗"
          isActive={editor.isActive("link")}
          onClick={setLink}
        />
        {!compact && (
          <span style={{ width: "1px", alignSelf: "stretch", background: COLORS.border, margin: "0 0.25rem" }} />
        )}
        {!compact && (
          <ToolbarButton
            title="Deshacer"
            label="↶"
            isActive={false}
            onClick={() => editor.chain().focus().undo().run()}
          />
        )}
        {!compact && (
          <ToolbarButton
            title="Rehacer"
            label="↷"
            isActive={false}
            onClick={() => editor.chain().focus().redo().run()}
          />
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
