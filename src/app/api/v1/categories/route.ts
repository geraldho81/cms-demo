import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, posts } from "@/db/schema";
import { requireApiKey, jsonError } from "@/lib/api-auth";
import { bumpPostsCache } from "@/lib/api-revalidate";
import { slugify } from "@/lib/content";

export async function GET(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      postCount: sql<number>`count(${posts.id})::int`,
    })
    .from(categories)
    .leftJoin(posts, eq(posts.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.name);
  return Response.json({ categories: rows });
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(`Invalid body: ${parsed.error.issues.map((i) => i.message).join("; ")}`);

  const slug = slugify(parsed.data.name);
  const [existing] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (existing) return Response.json({ category: existing, alreadyExisted: true });

  const [category] = await db
    .insert(categories)
    .values({ name: parsed.data.name.trim(), slug, description: parsed.data.description ?? null })
    .returning();
  bumpPostsCache();
  return Response.json({ category }, { status: 201 });
}
