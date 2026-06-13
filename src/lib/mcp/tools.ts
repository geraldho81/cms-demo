import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { pages, posts, categories } from "@/db/schema";
import type { Block } from "@/blocks/types";
import { slugify } from "@/lib/content";
import { resolveCategoryId } from "@/lib/categories";
import { blocksToMarkdown } from "@/lib/block-text";
import { markdownToHtml, htmlToMarkdown } from "@/lib/mcp/markdown";
import { bumpPostsCache } from "@/lib/api-revalidate";
import { pingPostsIndexNow } from "@/lib/indexnow";
import { isCloudinaryConfigured, uploadFromUrl } from "@/lib/cloudinary";
import { siteUrl } from "@/lib/site-url";

// MCP tool annotations: behaviour hints clients use to render the catalog and
// decide whether a call needs a confirmation prompt. Everything here is
// openWorldHint:false - the connector only touches the user's own CMS content.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const CREATE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const UPDATE = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };

const STATUS_DESC = "Publication state: draft (not public), published (live now), or scheduled (goes live at publishAt).";

export const MCP_TOOLS = [
  {
    name: "list_pages",
    title: "List pages",
    annotations: { title: "List pages", ...READ_ONLY },
    description:
      "List the site's pages with slug, title, status and public path. Pages are READ-ONLY through this connector - you can read them for context but cannot create, edit, or delete them. To change page content the user must use the visual editor at /admin.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_page",
    title: "Get page",
    annotations: { title: "Get page", ...READ_ONLY },
    description:
      "Read one page by slug, including its content rendered as Markdown so you understand the existing structure and tone. Read-only. The home page has slug 'home' and serves '/'.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Page slug, e.g. 'about'. Use 'home' for the front page." } },
      required: ["slug"],
      additionalProperties: false,
    },
  },
  {
    name: "list_posts",
    title: "List posts",
    annotations: { title: "List posts", ...READ_ONLY },
    description:
      "List blog posts (newest first) with slug, title, status, category, tags and excerpt. Metadata only - call get_post for the full body. Optionally filter by status.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["draft", "published", "scheduled"], description: STATUS_DESC },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_post",
    title: "Get post",
    annotations: { title: "Get post", ...READ_ONLY },
    description:
      "Read one blog post by slug. Returns the full body as Markdown plus title, excerpt, category, tags, hero image and SEO fields. ALWAYS call this before update_post so you can edit the real current body instead of overwriting it blindly.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
      additionalProperties: false,
    },
  },
  {
    name: "find_post_by_title",
    title: "Find post by title",
    annotations: { title: "Find post by title", ...READ_ONLY },
    description:
      "Resolve a post the user mentioned by title to its slug, without guessing. Matching is forgiving: casing, spacing, punctuation and small typos are tolerated. If one post matches it returns that post's slug and title; if several match it returns the candidates so you can ask which one; if none match it says so. Use this whenever the user names a post by its title rather than its slug.",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string", description: "Post title as the user said it" } },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "list_categories",
    title: "List categories",
    annotations: { title: "List categories", ...READ_ONLY },
    description: "List the blog's categories. Use this to pick a valid category name before assigning one to a post.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "add_image",
    title: "Add an image",
    annotations: { title: "Add an image", ...CREATE },
    description:
      "Turn an image URL into a hosted URL you can safely use in a post. ALWAYS call this before putting an image in a post body or setting a hero image - do not paste raw external URLs into content yourself. If the user has connected Cloudinary, the image is uploaded into their own media library and a permanent Cloudinary URL is returned. If Cloudinary is not connected, the original URL is validated and returned as-is (the response's 'hosted' field tells you which happened). The response includes a ready-to-paste Markdown snippet.",
    inputSchema: {
      type: "object",
      properties: {
        imageUrl: { type: "string", description: "Public URL of the image (https). Accepts image_url too." },
        alt: { type: "string", description: "Alt text describing the image, for accessibility and SEO." },
      },
      required: ["imageUrl"],
      additionalProperties: false,
    },
  },
  {
    name: "create_post",
    title: "Create post",
    annotations: { title: "Create post", ...CREATE },
    description:
      "Create a new blog post. The body is written in Markdown (headings, lists, bold, italic, links, code, blockquotes, images) and is converted to the site's format automatically. Lands as a DRAFT unless you pass status. To add images, first call add_image and embed the returned Markdown, or pass its URL as heroImageUrl. Set the category by name - it is created if it does not exist. If a post with the generated slug already exists this returns an error instead of overwriting; pass a different slug or use update_post. Never re-run a successful create as a retry.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string", description: "Post body in Markdown." },
        slug: { type: "string", description: "URL slug. Omit to derive it from the title." },
        excerpt: { type: "string", description: "Short summary for listings and SEO." },
        category: { type: "string", description: "Category name. Created if missing." },
        tags: { type: "array", items: { type: "string" } },
        heroImageUrl: { type: "string", description: "Hero image URL (run add_image first). Accepts hero_image_url." },
        heroImageAlt: { type: "string", description: "Hero image alt text. Accepts hero_image_alt." },
        status: { type: "string", enum: ["draft", "published", "scheduled"], description: STATUS_DESC },
        publishAt: { type: "string", description: "ISO datetime for scheduled posts. Accepts publish_at." },
        metaTitle: { type: "string", description: "SEO title override. Accepts meta_title." },
        metaDescription: { type: "string", description: "SEO meta description. Accepts meta_description." },
      },
      required: ["title", "content"],
      additionalProperties: false,
    },
  },
  {
    name: "update_post",
    title: "Update post",
    annotations: { title: "Update post", ...UPDATE },
    description:
      "Update an existing blog post by slug. Only the fields you provide change. IMPORTANT: content, when provided, REPLACES the entire body, so call get_post first, edit the returned Markdown, and send back the full edited body - do not send only the new part. Body is Markdown and is converted automatically. Use add_image for any images. This connector cannot delete posts.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Slug of the post to update." },
        title: { type: "string" },
        content: { type: "string", description: "Full replacement body in Markdown." },
        newSlug: { type: "string", description: "Change the post's slug. Accepts new_slug." },
        excerpt: { type: "string" },
        category: { type: "string", description: "Category name. Created if missing." },
        tags: { type: "array", items: { type: "string" } },
        heroImageUrl: { type: "string", description: "Accepts hero_image_url." },
        heroImageAlt: { type: "string", description: "Accepts hero_image_alt." },
        status: { type: "string", enum: ["draft", "published", "scheduled"], description: STATUS_DESC },
        publishAt: { type: "string", description: "ISO datetime, or empty string to clear. Accepts publish_at." },
        metaTitle: { type: "string", description: "Accepts meta_title." },
        metaDescription: { type: "string", description: "Accepts meta_description." },
      },
      required: ["slug"],
      additionalProperties: false,
    },
  },
] as const;

// --- argument helpers (forgiving snake_case <-> camelCase) -------------------

type Args = Record<string, unknown>;

function snake(name: string): string {
  return name.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

function get(args: Args, name: string): unknown {
  if (args[name] !== undefined) return args[name];
  const s = snake(name);
  return args[s];
}

function str(args: Args, name: string): string | undefined {
  const v = get(args, name);
  return typeof v === "string" ? v : undefined;
}

function strArray(args: Args, name: string): string[] | undefined {
  const v = get(args, name);
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return undefined;
}

function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function pageUrl(slug: string): string {
  return slug === "home" ? `${siteUrl()}/` : `${siteUrl()}/${slug}`;
}

function postUrl(slug: string): string {
  return `${siteUrl()}/blog/${slug}`;
}

// --- tool dispatch -----------------------------------------------------------

export async function callTool(tool: string, args: Args): Promise<unknown> {
  switch (tool) {
    case "list_pages": {
      const rows = await db
        .select({ slug: pages.slug, title: pages.title, status: pages.status, updatedAt: pages.updatedAt })
        .from(pages)
        .where(isNull(pages.deletedAt))
        .orderBy(pages.slug);
      return { pages: rows.map((p) => ({ ...p, url: pageUrl(p.slug) })) };
    }

    case "get_page": {
      const slug = str(args, "slug");
      if (!slug) throw new Error("slug is required");
      const [page] = await db
        .select()
        .from(pages)
        .where(and(eq(pages.slug, slug), isNull(pages.deletedAt)))
        .limit(1);
      if (!page) throw new Error(`Page not found: ${slug}`);
      return {
        slug: page.slug,
        title: page.title,
        status: page.status,
        url: pageUrl(page.slug),
        content: blocksToMarkdown((page.blocks as Block[]) ?? []),
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        readOnly: true,
        note: "Pages are read-only through this connector. Edit them in the visual editor at /admin.",
      };
    }

    case "list_posts": {
      const status = str(args, "status");
      const where = status
        ? and(eq(posts.status, status as "draft" | "published" | "scheduled"), isNull(posts.deletedAt))
        : isNull(posts.deletedAt);
      const rows = await db
        .select({
          slug: posts.slug,
          title: posts.title,
          status: posts.status,
          excerpt: posts.excerpt,
          tags: posts.tags,
          categoryName: categories.name,
          updatedAt: posts.updatedAt,
        })
        .from(posts)
        .leftJoin(categories, eq(posts.categoryId, categories.id))
        .where(where)
        .orderBy(desc(posts.updatedAt));
      return { posts: rows.map((p) => ({ ...p, url: postUrl(p.slug) })) };
    }

    case "get_post": {
      const slug = str(args, "slug");
      if (!slug) throw new Error("slug is required");
      const [row] = await db
        .select({ post: posts, categoryName: categories.name })
        .from(posts)
        .leftJoin(categories, eq(posts.categoryId, categories.id))
        .where(and(eq(posts.slug, slug), isNull(posts.deletedAt)))
        .limit(1);
      if (!row) throw new Error(`Post not found: ${slug}`);
      const p = row.post;
      return {
        slug: p.slug,
        title: p.title,
        status: p.status,
        url: postUrl(p.slug),
        excerpt: p.excerpt,
        category: row.categoryName,
        tags: p.tags,
        heroImageUrl: p.heroImageUrl,
        heroImageAlt: p.heroImageAlt,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        publishAt: p.publishAt,
        content: htmlToMarkdown(p.body),
      };
    }

    case "find_post_by_title": {
      const title = str(args, "title");
      if (!title) throw new Error("title is required");
      const rows = await db
        .select({ slug: posts.slug, title: posts.title, status: posts.status })
        .from(posts)
        .where(isNull(posts.deletedAt));
      const target = normalizeTitle(title);
      const exact = rows.filter((r) => normalizeTitle(r.title) === target);
      const partial = exact.length
        ? exact
        : rows.filter((r) => {
            const n = normalizeTitle(r.title);
            return n.includes(target) || target.includes(n);
          });
      if (partial.length === 1) {
        const r = partial[0];
        return { match: { ...r, url: postUrl(r.slug) } };
      }
      if (partial.length === 0) {
        return { match: null, message: `No post found matching "${title}". Use list_posts to see all posts.` };
      }
      return {
        match: null,
        message: `Several posts match "${title}". Ask the user which one, then use its slug.`,
        candidates: partial.map((r) => ({ ...r, url: postUrl(r.slug) })),
      };
    }

    case "list_categories": {
      const rows = await db.select({ name: categories.name, slug: categories.slug }).from(categories).orderBy(categories.name);
      return { categories: rows };
    }

    case "add_image": {
      const imageUrl = str(args, "imageUrl");
      const alt = str(args, "alt");
      if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) throw new Error("imageUrl must be a public http(s) URL");
      if (await isCloudinaryConfigured()) {
        const item = await uploadFromUrl(imageUrl, alt ? { alt } : {});
        return {
          hosted: "cloudinary",
          url: item.url,
          alt: alt ?? "",
          markdown: `![${alt ?? ""}](${item.url})`,
          note: "Uploaded into the user's Cloudinary. Use this url as heroImageUrl or embed the markdown in the post body.",
        };
      }
      return {
        hosted: "external",
        url: imageUrl,
        alt: alt ?? "",
        markdown: `![${alt ?? ""}](${imageUrl})`,
        note: "Cloudinary is not connected, so the original URL is used directly. It works as long as that URL stays online.",
      };
    }

    case "create_post": {
      const title = str(args, "title");
      const content = str(args, "content");
      if (!title) throw new Error("title is required");
      if (content === undefined) throw new Error("content is required");
      const slug = slugify(str(args, "slug") || title);
      const [existing] = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.slug, slug)).limit(1);
      if (existing) {
        throw new Error(`A post with slug "${slug}" already exists. Use update_post, or pass a different slug.`);
      }
      const status = (str(args, "status") as "draft" | "published" | "scheduled" | undefined) ?? "draft";
      const category = str(args, "category");
      const publishAt = str(args, "publishAt");
      const [created] = await db
        .insert(posts)
        .values({
          slug,
          title,
          body: markdownToHtml(content),
          excerpt: str(args, "excerpt") ?? null,
          categoryId: category !== undefined ? await resolveCategoryId(category) : null,
          tags: strArray(args, "tags") ?? [],
          heroImageUrl: str(args, "heroImageUrl") ?? null,
          heroImageAlt: str(args, "heroImageAlt") ?? null,
          status,
          publishAt: publishAt ? new Date(publishAt) : null,
          publishedAt: status === "published" ? new Date() : null,
          metaTitle: str(args, "metaTitle") ?? null,
          metaDescription: str(args, "metaDescription") ?? null,
        })
        .returning({ slug: posts.slug, status: posts.status });
      bumpPostsCache();
      if (created.status === "published") pingPostsIndexNow([created.slug]);
      return { ok: true, slug: created.slug, status: created.status, url: postUrl(created.slug) };
    }

    case "update_post": {
      const slug = str(args, "slug");
      if (!slug) throw new Error("slug is required");
      const [target] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.slug, slug), isNull(posts.deletedAt)))
        .limit(1);
      if (!target) throw new Error(`Post not found: ${slug}`);

      const update: Record<string, unknown> = { updatedAt: new Date() };
      const title = str(args, "title");
      if (title !== undefined) update.title = title;
      const content = str(args, "content");
      if (content !== undefined) update.body = markdownToHtml(content);
      const newSlug = str(args, "newSlug");
      if (newSlug !== undefined) update.slug = slugify(newSlug);
      if (get(args, "excerpt") !== undefined) update.excerpt = str(args, "excerpt") ?? null;
      const category = str(args, "category");
      if (category !== undefined) update.categoryId = await resolveCategoryId(category);
      const tags = strArray(args, "tags");
      if (tags !== undefined) update.tags = tags;
      if (get(args, "heroImageUrl") !== undefined) update.heroImageUrl = str(args, "heroImageUrl") ?? null;
      if (get(args, "heroImageAlt") !== undefined) update.heroImageAlt = str(args, "heroImageAlt") ?? null;
      const status = str(args, "status");
      if (status !== undefined) {
        update.status = status;
        if (status === "published") update.publishedAt = new Date();
      }
      const publishAt = get(args, "publishAt");
      if (publishAt !== undefined) update.publishAt = publishAt ? new Date(String(publishAt)) : null;
      if (get(args, "metaTitle") !== undefined) update.metaTitle = str(args, "metaTitle") ?? null;
      if (get(args, "metaDescription") !== undefined) update.metaDescription = str(args, "metaDescription") ?? null;

      const [updated] = await db
        .update(posts)
        .set(update)
        .where(eq(posts.id, target.id))
        .returning({ slug: posts.slug, status: posts.status });
      bumpPostsCache();
      if (updated.status === "published") pingPostsIndexNow([updated.slug]);
      return { ok: true, slug: updated.slug, status: updated.status, url: postUrl(updated.slug) };
    }

    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}
