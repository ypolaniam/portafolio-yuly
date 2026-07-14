import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "strike",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
  "hr",
];

const ALLOWED_ATTR = ["href", "target", "rel"];

const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

// `isomorphic-dompurify` uses the same DOMPurify implementation on the server
// (via jsdom) and on the client (via the browser window), so the sanitized
// output is byte-identical in both environments. This avoids React hydration
// mismatches in `client:load` components and applies full-strength sanitization
// everywhere instead of a weaker server-side fallback.
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

export function stripHtml(html: string): string {
  if (!html) return "";
  const withoutTags = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h\d|li|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, "");
  return withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
