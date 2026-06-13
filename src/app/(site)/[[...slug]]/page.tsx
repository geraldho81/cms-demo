import type { Metadata } from "next";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import { BlockRenderer } from "@/blocks/BlockRenderer";
import { getPageBySlug, getRedirect, getSettings } from "@/lib/queries";
import { isLive } from "@/lib/content";
import { auth } from "@/lib/auth";
import { siteUrl } from "@/lib/site-url";
import { JsonLd, websiteSchema, faqSchema } from "@/lib/jsonld";
import { collectFaqItems } from "@/lib/block-text";

type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ preview?: string }>;
};

function slugFromParams(slug?: string[]): string {
  return slug?.length ? slug.join("/") : "home";
}

async function resolvePage(props: Props) {
  const { slug } = await props.params;
  const { preview } = await props.searchParams;
  const page = await getPageBySlug(slugFromParams(slug));
  if (!page) return null;
  if (!isLive(page.status, page.publishAt)) {
    // Drafts are visible only to signed-in editors with ?preview=1
    if (preview !== "1") return null;
    const session = await auth();
    if (!session?.user) return null;
  }
  return page;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const page = await resolvePage(props);
  if (!page) return {};
  const settings = await getSettings();
  const title = page.metaTitle || `${page.title} | ${settings.siteName}`;
  const description = page.metaDescription || settings.tagline || undefined;
  const ogImage = page.ogImage || settings.defaultOgImage || undefined;
  const canonical = page.slug === "home" ? siteUrl() : `${siteUrl()}/${page.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    ...(page.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url: canonical,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function CmsPage(props: Props) {
  const page = await resolvePage(props);
  if (!page) {
    // No page at this path - check the redirect table before 404ing
    const { slug } = await props.params;
    const hit = await getRedirect(`/${slugFromParams(slug)}`);
    if (hit) {
      if (hit.permanent) permanentRedirect(hit.toPath);
      redirect(hit.toPath);
    }
    notFound();
  }

  const isHome = page.slug === "home";
  const settings = isHome ? await getSettings() : null;
  const faqItems = collectFaqItems(page.blocks);

  return (
    <>
      {settings && <JsonLd data={websiteSchema(settings)} />}
      {faqItems.length > 0 && <JsonLd data={faqSchema(faqItems)} />}
      <BlockRenderer blocks={page.blocks} />
    </>
  );
}
