import { siteUrl } from "@/lib/site-url";

/** Renders a JSON-LD script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function websiteSchema(settings: { siteName: string; tagline: string; logoUrl: string }) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.siteName,
    url: base,
    ...(settings.tagline ? { description: settings.tagline } : {}),
    publisher: {
      "@type": "Organization",
      name: settings.siteName,
      url: base,
      ...(settings.logoUrl ? { logo: settings.logoUrl } : {}),
    },
  };
}

export function articleSchema(post: {
  title: string;
  slug: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  publishedAt: Date | string | null;
  updatedAt: Date | string | null;
  authorName: string | null;
  categoryName: string | null;
  tags: string[];
  siteName: string;
}) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    url: `${base}/blog/${post.slug}`,
    mainEntityOfPage: `${base}/blog/${post.slug}`,
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(post.heroImageUrl ? { image: post.heroImageUrl } : {}),
    ...(post.publishedAt ? { datePublished: new Date(post.publishedAt).toISOString() } : {}),
    ...(post.updatedAt ? { dateModified: new Date(post.updatedAt).toISOString() } : {}),
    ...(post.authorName ? { author: { "@type": "Person", name: post.authorName } } : {}),
    ...(post.categoryName ? { articleSection: post.categoryName } : {}),
    ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
    publisher: { "@type": "Organization", name: post.siteName, url: base },
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
