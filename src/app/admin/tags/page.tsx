import { db } from "@/db";
import { posts } from "@/db/schema";
import { TagsManager } from "@/components/admin/TagsManager";

export default async function TagsPage() {
  const rows = await db.select({ tags: posts.tags }).from(posts);
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const tags = [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  return <TagsManager initial={tags} />;
}
