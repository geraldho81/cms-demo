/** Shared publishing rules - safe to import anywhere (no DB). */

export type ContentStatus = "draft" | "published" | "scheduled";

export function isLive(status: ContentStatus, publishAt: Date | string | null): boolean {
  if (status === "published") return true;
  if (status === "scheduled" && publishAt) return new Date(publishAt).getTime() <= Date.now();
  return false;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readingTime(text: string): string {
  const words = text.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

/**
 * Sanitize an author-supplied link href. Allows http(s), mailto, tel, and
 * relative/anchor/query links; blocks dangerous schemes (javascript:, data:,
 * vbscript:, ...). Returns "#" for anything blocked or empty.
 */
export function safeHref(href: string | null | undefined): string {
  const h = (href ?? "").trim();
  if (!h) return "#";
  // Normalize the way browsers do (they ignore control chars/whitespace inside
  // a scheme) before testing, so tricks like "java\tscript:" can't slip through.
  const probe = h.replace(/[\x00-\x20]+/g, "").toLowerCase();
  if (/^(https?:|mailto:|tel:)/.test(probe)) return h;
  if (/^[a-z][a-z0-9+.-]*:/.test(probe)) return "#"; // any other explicit scheme
  return h; // relative path, anchor, or query string
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
