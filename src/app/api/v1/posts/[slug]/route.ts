import { z } from "zod";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireApiKey, jsonError } from "@/lib/api-auth";
import { bumpPostsCache } from "@/lib/api-revalidate";
import { slugify } from "@/lib/content";
import { pingPostsIndexNow } from "@/lib/indexnow";
import { resolveCategoryId } from "@/lib/categories";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  body: z.string().optional(),
  excerpt: z.string().nullable().optional(),
  // Category by name or slug - created automatically if it does not exist
  category: z.string().nullable().optional(),
  noindex: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  heroImageUrl: z.string().nullable().optional(),
  heroImageAlt: z.string().nullable().optional(),
  status: z.enum(["draft", "published", "scheduled"]).optional(),
  publishAt: z.string().datetime({ offset: true }).nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
});

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  const { slug } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  if (!post) return jsonError("Post not found", 404);
  return Response.json({ post });
}

export async function PUT(request: Request, { params }: Params) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  const { slug } = await params;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(`Invalid body: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const data = parsed.data;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) update.title = data.title;
  if (data.slug !== undefined) update.slug = slugify(data.slug);
  if (data.body !== undefined) update.body = data.body;
  if (data.excerpt !== undefined) update.excerpt = data.excerpt;
  if (data.category !== undefined) update.categoryId = await resolveCategoryId(data.category);
  if (data.noindex !== undefined) update.noindex = data.noindex;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.heroImageUrl !== undefined) update.heroImageUrl = data.heroImageUrl;
  if (data.heroImageAlt !== undefined) update.heroImageAlt = data.heroImageAlt;
  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === "published") update.publishedAt = new Date();
  }
  if (data.publishAt !== undefined) update.publishAt = data.publishAt ? new Date(data.publishAt) : null;
  if (data.metaTitle !== undefined) update.metaTitle = data.metaTitle;
  if (data.metaDescription !== undefined) update.metaDescription = data.metaDescription;

  const [post] = await db.update(posts).set(update).where(eq(posts.slug, slug)).returning();
  if (!post) return jsonError("Post not found", 404);

  bumpPostsCache();
  if (post.status === "published") pingPostsIndexNow([post.slug]);
  return Response.json({ post });
}

export async function DELETE(request: Request, { params }: Params) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  const { slug } = await params;
  // Trash by default (restorable from /admin); ?force=true deletes permanently.
  const force = new URL(request.url).searchParams.get("force") === "true";
  const affected = force
    ? await db.delete(posts).where(eq(posts.slug, slug)).returning({ slug: posts.slug, status: posts.status })
    : await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.slug, slug)).returning({ slug: posts.slug, status: posts.status });
  if (!affected.length) return jsonError("Post not found", 404);
  bumpPostsCache();
  if (affected[0].status === "published") pingPostsIndexNow([affected[0].slug]);
  return Response.json({ ok: true, trashed: !force });
}
