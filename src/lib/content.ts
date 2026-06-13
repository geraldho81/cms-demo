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

export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
