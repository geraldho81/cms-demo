import { getLivePages, getLivePosts, getPostBySlug, getSettings } from "@/lib/queries";
import { blocksToMarkdown, htmlToMarkdown } from "@/lib/block-text";
import { siteUrl } from "@/lib/site-url";
import type { Block } from "@/blocks/types";

export async function GET() {
  const [settings, pages, posts] = await Promise.all([getSettings(), getLivePages(), getLivePosts()]);

  const out: string[] = [`# ${settings.siteName}`];
  if (settings.tagline) out.push(`> ${settings.tagline}`);

  for (const page of pages.filter((p) => !p.noindex)) {
    const url = page.slug === "home" ? siteUrl() : `${siteUrl()}/${page.slug}`;
    out.push("---");
    out.push(`# ${page.metaTitle || page.title}\n\nURL: ${url}`);
    if (page.metaDescription) out.push(page.metaDescription);
    const body = blocksToMarkdown(page.blocks as Block[]);
    if (body) out.push(body);
  }

  for (const summary of posts) {
    const row = await getPostBySlug(summary.slug);
    if (!row) continue;
    out.push("---");
    out.push(`# ${row.post.title}\n\nURL: ${siteUrl()}/blog/${row.post.slug}`);
    if (row.post.excerpt) out.push(row.post.excerpt);
    const body = htmlToMarkdown(row.post.body);
    if (body) out.push(body);
  }

  return new Response(out.join("\n\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
