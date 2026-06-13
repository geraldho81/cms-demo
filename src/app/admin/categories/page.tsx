import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, posts } from "@/db/schema";
import { CategoriesManager } from "@/components/admin/CategoriesManager";

export default async function CategoriesPage() {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      postCount: sql<number>`count(${posts.id})::int`,
    })
    .from(categories)
    .leftJoin(posts, eq(posts.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.name);

  return <CategoriesManager initial={rows} />;
}
