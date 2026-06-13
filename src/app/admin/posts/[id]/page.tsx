import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts, categories } from "@/db/schema";
import { PostEditor } from "@/components/admin/editor/PostEditor";

export default async function PostEditorRoute(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [[post], allCategories] = await Promise.all([
    db.select().from(posts).where(eq(posts.id, id)).limit(1),
    db.select().from(categories).orderBy(categories.name),
  ]);
  if (!post) notFound();

  return (
    <PostEditor
      categories={allCategories.map((c) => ({ id: c.id, name: c.name }))}
      initial={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        body: post.body,
        excerpt: post.excerpt,
        categoryId: post.categoryId,
        tags: post.tags,
        heroImageUrl: post.heroImageUrl,
        heroImageAlt: post.heroImageAlt,
        status: post.status,
        publishAt: post.publishAt?.toISOString() ?? null,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        noindex: post.noindex,
      }}
    />
  );
}
