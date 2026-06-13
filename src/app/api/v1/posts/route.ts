import { z } from "zod";
import { db } from "@/db";
import { posts, categories } from "@/db/schema";
import { desc, eq, isNull } from "drizzle-orm";
import { requireApiKey, jsonError } from "@/lib/api-auth";
import { bumpPostsCache } from "@/lib/api-revalidate";
import { slugify } from "@/lib/content";
import { pingPostsIndexNow } from "@/lib/indexnow";
import { resolveCategoryId } from "@/lib/categories";

const createPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  body: z.string().default(""),
  excerpt: z.string().nullable().optional(),
  // Category by name or slug - created automatically if it does not exist
  category: z.string().nullable().optional(),
  noindex: z.boolean().optional(),
  tags: z.array(z.string()).default([]),
  heroImageUrl: z.string().nullable().optional(),
  heroImageAlt: z.string().nullable().optional(),
  status: z.enum(["draft", "published", "scheduled"]).default("draft"),
  publishAt: z.string().datetime({ offset: true }).nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  const rows = await db
    .select({ id: posts.id, slug: posts.slug, title: posts.title, category: categories.name, status: posts.status, publishAt: posts.publishAt, updatedAt: posts.updatedAt })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(isNull(posts.deletedAt))
    .orderBy(desc(posts.updatedAt));
  return Response.json({ posts: rows });
}

export async function POST(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;

  const parsed = createPostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(`Invalid body: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const data = parsed.data;

  const slug = slugify(data.slug || data.title);
  const [existing] = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).limit(1);
  if (existing) return jsonError(`A post with slug "${slug}" already exists. Use PUT /api/v1/posts/${slug} to update it.`, 409);

  const [post] = await db
    .insert(posts)
    .values({
      title: data.title,
      slug,
      body: data.body,
      excerpt: data.excerpt ?? null,
      categoryId: await resolveCategoryId(data.category),
      noindex: data.noindex ?? false,
      tags: data.tags,
      heroImageUrl: data.heroImageUrl ?? null,
      heroImageAlt: data.heroImageAlt ?? null,
      status: data.status,
      publishAt: data.publishAt ? new Date(data.publishAt) : null,
      publishedAt: data.status === "published" ? new Date() : null,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
    })
    .returning();

  bumpPostsCache();
  if (post.status === "published") pingPostsIndexNow([post.slug]);
  return Response.json({ post }, { status: 201 });
}
