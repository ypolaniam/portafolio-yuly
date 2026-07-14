import DOMPurify from "dompurify";

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

function sanitizeOnClient(html: string): string {
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

// Used during SSR / prerender where there is no DOM (and thus no DOMPurify).
// Content is admin-authored and self-administered, so this is a pragmatic
// strip of the most dangerous elements/attributes; the client re-sanitizes on
// hydration with the full DOMPurify allowlist.
function sanitizeOnServer(html: string): string {
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?<\/embed>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/\s(on\w+)\s*=\s*"[^"]*"/gi, "")
    .replace(/\s(on\w+)\s*=\s*'[^']*'/gi, "")
    .replace(/\s(on\w+)\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*"(javascript|data):[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'(javascript|data):[^']*'/gi, "$1='#'");
  return out;
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  if (typeof window !== "undefined" && typeof window.document !== "undefined") {
    return sanitizeOnClient(html);
  }
  return sanitizeOnServer(html);
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
