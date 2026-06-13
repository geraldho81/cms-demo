import { z } from "zod";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq } from "drizzle-orm";
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

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  blocks: z.array(blockSchema).optional(),
  status: z.enum(["draft", "published", "scheduled"]).optional(),
  publishAt: z.string().datetime({ offset: true }).nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
});

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  const { slug } = await params;
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!page) return jsonError("Page not found", 404);
  return Response.json({ page });
}

export async function PUT(request: Request, { params }: Params) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  const { slug } = await params;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(`Invalid body: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const data = parsed.data;

  if (data.blocks) {
    try {
      validateBlocks(data.blocks);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "Invalid blocks");
    }
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) update.title = data.title;
  if (data.slug !== undefined) update.slug = slugify(data.slug);
  if (data.blocks !== undefined) update.blocks = data.blocks;
  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === "published") update.publishedAt = new Date();
  }
  if (data.publishAt !== undefined) update.publishAt = data.publishAt ? new Date(data.publishAt) : null;
  if (data.metaTitle !== undefined) update.metaTitle = data.metaTitle;
  if (data.metaDescription !== undefined) update.metaDescription = data.metaDescription;
  if (data.ogImage !== undefined) update.ogImage = data.ogImage;

  const [page] = await db.update(pages).set(update).where(eq(pages.slug, slug)).returning();
  if (!page) return jsonError("Page not found", 404);

  bumpPagesCache();
  if (page.status === "published") pingPagesIndexNow([page.slug]);
  return Response.json({ page });
}

export async function DELETE(request: Request, { params }: Params) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  const { slug } = await params;
  // Trash by default (restorable from /admin); ?force=true deletes permanently.
  const force = new URL(request.url).searchParams.get("force") === "true";
  const affected = force
    ? await db.delete(pages).where(eq(pages.slug, slug)).returning({ slug: pages.slug, status: pages.status })
    : await db.update(pages).set({ deletedAt: new Date() }).where(eq(pages.slug, slug)).returning({ slug: pages.slug, status: pages.status });
  if (!affected.length) return jsonError("Page not found", 404);
  bumpPagesCache();
  if (affected[0].status === "published") pingPagesIndexNow([affected[0].slug]);
  return Response.json({ ok: true, trashed: !force });
}
