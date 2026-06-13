import { z } from "zod";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { desc, eq, isNull } from "drizzle-orm";
import { requireApiKey, jsonError } from "@/lib/api-auth";
import { bumpPagesCache } from "@/lib/api-revalidate";
import { validateBlocks } from "@/blocks/registry";
import { slugify } from "@/lib/content";
import { pingPagesIndexNow } from "@/lib/indexnow";
import type { Block } from "@/blocks/types";

const blockSchema: z.ZodType<Block> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    props: z.record(z.string(), z.unknown()),
    zones: z.array(z.array(blockSchema)).optional(),
  })
);

const createPageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  blocks: z.array(blockSchema).default([]),
  status: z.enum(["draft", "published", "scheduled"]).default("draft"),
  publishAt: z.string().datetime({ offset: true }).nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  const rows = await db
    .select({ id: pages.id, slug: pages.slug, title: pages.title, status: pages.status, publishAt: pages.publishAt, updatedAt: pages.updatedAt })
    .from(pages)
    .where(isNull(pages.deletedAt))
    .orderBy(desc(pages.updatedAt));
  return Response.json({ pages: rows });
}

export async function POST(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  const parsed = createPageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(`Invalid body: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const data = parsed.data;

  try {
    validateBlocks(data.blocks);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Invalid blocks");
  }

  const slug = slugify(data.slug || data.title);
  const [existing] = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug)).limit(1);
  if (existing) return jsonError(`A page with slug "${slug}" already exists. Use PUT /api/v1/pages/${slug} to update it.`, 409);

  const [page] = await db
    .insert(pages)
    .values({
      title: data.title,
      slug,
      blocks: data.blocks,
      status: data.status,
      publishAt: data.publishAt ? new Date(data.publishAt) : null,
      publishedAt: data.status === "published" ? new Date() : null,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
      ogImage: data.ogImage ?? null,
    })
    .returning();

  bumpPagesCache();
  if (page.status === "published") pingPagesIndexNow([page.slug]);
  return Response.json({ page }, { status: 201 });
}
