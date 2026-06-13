import { getLivePages, getLivePosts, getSettings } from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";

function pageMdUrl(slug: string): string {
  return slug.includes("/") ? `${siteUrl()}/md/${slug}` : `${siteUrl()}/${slug}.md`;
}

export async function GET() {
  const [settings, pages, posts] = await Promise.all([getSettings(), getLivePages(), getLivePosts()]);

  const out: string[] = [`# ${settings.siteName}`];
  if (settings.tagline) out.push(`> ${settings.tagline}`);

  const listedPages = pages.filter((p) => !p.noindex);
  if (listedPages.length) {
    out.push("## Pages");
    out.push(
      listedPages
        .map((p) => `- [${p.title}](${pageMdUrl(p.slug)})${p.metaDescription ? `: ${p.metaDescription}` : ""}`)
        .join("\n")
    );
  }

  if (posts.length) {
    out.push("## Blog posts");
    out.push(
      posts
        .map((p) => `- [${p.title}](${siteUrl()}/blog/${p.slug}.md)${p.excerpt ? `: ${p.excerpt}` : ""}`)
        .join("\n")
    );
  }

  return new Response(out.join("\n\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}
