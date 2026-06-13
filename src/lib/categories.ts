import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { slugify } from "@/lib/content";

/**
 * Resolves a category given by name or slug to its id, creating it if it
 * does not exist (WordPress-style). Pass null/empty to clear the category.
 */
export async function resolveCategoryId(category: string | null | undefined): Promise<string | null> {
  if (!category || !category.trim()) return null;
  const name = category.trim();
  const slug = slugify(name);
  const [existing] = await db
    .select()
    .from(categories)
    .where(or(eq(categories.slug, slug), eq(categories.name, name)))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(categories).values({ name, slug }).returning();
  return created.id;
}
