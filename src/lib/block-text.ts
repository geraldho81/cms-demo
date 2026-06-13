import type { Block } from "@/blocks/types";

/** Shared text extraction - safe to import anywhere (no DB, no React). */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#x27|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

/** Minimal HTML to markdown for Tiptap output and post bodies. */
export function htmlToMarkdown(html: string): string {
  let s = html;
  s = s.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, inner) => `\n\n${"#".repeat(Number(n))} ${inner}\n\n`);
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1");
  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    const text = inner.replace(/<\/?p[^>]*>/gi, "").trim();
    return `\n\n> ${text}\n\n`;
  });
  s = s.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**");
  s = s.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "*$2*");
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  s = s.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, "![$1]($2)");
  s = s.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  s = s.replace(/<\/(p|div|ul|ol|figure)>/gi, "\n\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

type AnyProps = Record<string, unknown>;

const str = (p: AnyProps, key: string): string => (typeof p[key] === "string" ? (p[key] as string) : "");
const arr = (p: AnyProps, key: string): AnyProps[] => (Array.isArray(p[key]) ? (p[key] as AnyProps[]) : []);

function lines(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join("\n\n");
}

function link(label: string, href: string): string {
  return label ? `[${label}](${href || "#"})` : "";
}

/** Per-block markdown emitters. Keys are block types from src/blocks/registry.ts. */
const emitters: Record<string, (p: AnyProps) => string> = {
  hero: (p) =>
    lines(
      str(p, "eyebrow"),
      `# ${str(p, "heading")}`,
      str(p, "subheading"),
      [link(str(p, "primaryLabel"), str(p, "primaryHref")), link(str(p, "secondaryLabel"), str(p, "secondaryHref"))]
        .filter(Boolean)
        .join(" | ")
    ),
  heading: (p) => `${str(p, "level") === "h3" ? "###" : "##"} ${str(p, "text")}`,
  richtext: (p) => htmlToMarkdown(str(p, "html")),
  image: (p) => lines(str(p, "url") && `![${str(p, "alt")}](${str(p, "url")})`, str(p, "caption")),
  gallery: (p) =>
    arr(p, "images")
      .map((img) => `![${str(img, "alt")}](${str(img, "url")})`)
      .join("\n"),
  cta: (p) => lines(`## ${str(p, "heading")}`, str(p, "body"), link(str(p, "buttonLabel"), str(p, "buttonHref"))),
  "feature-grid": (p) =>
    lines(
      str(p, "heading") && `## ${str(p, "heading")}`,
      str(p, "intro"),
      arr(p, "items")
        .map((it) => `- **${str(it, "title")}** - ${str(it, "body")}`)
        .join("\n")
    ),
  testimonial: (p) =>
    lines(`> ${str(p, "quote")}`, [str(p, "name"), str(p, "role")].filter(Boolean).join(", ")),
  "faq-accordion": (p) =>
    lines(
      str(p, "heading") && `## ${str(p, "heading")}`,
      arr(p, "items")
        .map((it) => `### ${str(it, "q")}\n\n${str(it, "a")}`)
        .join("\n\n")
    ),
  "pricing-table": (p) =>
    lines(
      str(p, "heading") && `## ${str(p, "heading")}`,
      arr(p, "tiers")
        .map((t) =>
          lines(
            `### ${str(t, "name")} - ${str(t, "price")}${str(t, "period") ? ` ${str(t, "period")}` : ""}`,
            str(t, "description"),
            str(t, "features")
              .split(/\n/)
              .filter(Boolean)
              .map((f) => `- ${f.trim()}`)
              .join("\n"),
            link(str(t, "buttonLabel"), str(t, "buttonHref"))
          )
        )
        .join("\n\n")
    ),
  "video-embed": (p) => lines(str(p, "caption"), str(p, "url") && `Video: ${str(p, "url")}`),
  "html-embed": (p) => htmlToMarkdown(str(p, "html")),
  "posts-list": (p) => (str(p, "heading") ? `## ${str(p, "heading")}` : ""),
  spacer: () => "",
  "logos-strip": (p) =>
    lines(
      str(p, "heading"),
      arr(p, "logos")
        .map((l) => str(l, "alt"))
        .filter(Boolean)
        .join(", ")
    ),
  columns: () => "",
  "contact-form": (p) => lines(str(p, "eyebrow"), str(p, "heading") && `## ${str(p, "heading")}`, str(p, "body")),
};

/** Last resort for block types without an emitter: pull out the string props. */
function fallbackText(props: unknown): string {
  if (typeof props === "string") return props;
  if (Array.isArray(props)) return props.map(fallbackText).filter(Boolean).join("\n");
  if (props && typeof props === "object") {
    return Object.entries(props as AnyProps)
      .filter(([key]) => !/href|url|path|anchor|icon|id$/i.test(key))
      .map(([, value]) => fallbackText(value))
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

/** Serialize a block tree (including nested zones) to plain markdown. */
export function blocksToMarkdown(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    const emit = emitters[block.type];
    const text = emit ? emit(block.props) : fallbackText(block.props);
    if (text.trim()) parts.push(text.trim());
    for (const zone of block.zones ?? []) {
      const nested = blocksToMarkdown(zone);
      if (nested) parts.push(nested);
    }
  }
  return parts.join("\n\n");
}

/** Collect FAQ q/a pairs from a block tree (for FAQPage JSON-LD). */
export function collectFaqItems(blocks: Block[]): { q: string; a: string }[] {
  const items: { q: string; a: string }[] = [];
  for (const block of blocks) {
    if (block.type === "faq-accordion") {
      for (const it of arr(block.props, "items")) {
        const q = str(it, "q");
        const a = str(it, "a");
        if (q && a) items.push({ q, a });
      }
    }
    for (const zone of block.zones ?? []) items.push(...collectFaqItems(zone));
  }
  return items;
}
