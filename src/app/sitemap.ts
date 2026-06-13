import type { MetadataRoute } from "next";
import { getLivePages, getLivePosts } from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  try {
    const [pages, posts] = await Promise.all([getLivePages(), getLivePosts()]);
    const indexablePages = pages.filter((p) => !p.noindex);
    const indexablePosts = posts.filter((p) => !p.noindex);
    const blogModified = indexablePosts.reduce<Date | undefined>(
      (latest, p) => (p.updatedAt && (!latest || p.updatedAt > latest) ? p.updatedAt : latest),
      undefined
    );

    return [
      ...indexablePages.map((p) => ({
        url: p.slug === "home" ? base : `${base}/${p.slug}`,
        lastModified: p.updatedAt ?? undefined,
        changeFrequency: "weekly" as const,
        priority: p.slug === "home" ? 1 : 0.8,
      })),
      {
        url: `${base}/blog`,
        lastModified: blogModified ?? new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.9,
      },
      ...indexablePosts.map((p) => ({
        url: `${base}/blog/${p.slug}`,
        lastModified: p.updatedAt ?? undefined,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return [{ url: base, lastModified: new Date() }];
  }
}
