import { getLivePosts, getSettings } from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const base = siteUrl();
  let posts: Awaited<ReturnType<typeof getLivePosts>> = [];
  let settings = { siteName: "Site", tagline: "" };
  try {
    [posts, settings] = await Promise.all([getLivePosts(), getSettings()]);
  } catch {
    // Database unavailable (e.g. during build) - serve an empty feed.
  }
  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${base}/blog/${p.slug}</link>
      <guid>${base}/blog/${p.slug}</guid>
      ${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ""}
      <pubDate>${new Date(p.publishedAt ?? p.publishAt ?? Date.now()).toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(settings.siteName)} Blog</title>
    <link>${base}/blog</link>
    <description>${esc(settings.tagline || `Latest posts from ${settings.siteName}`)}</description>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
