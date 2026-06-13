/**
 * CMS CLI - for humans and AI agents working inside this repo.
 *
 *   npm run cms -- <command> [args]
 *
 * Commands:
 *   create-admin --email <e> --password <p> [--name <n>]
 *   list-blocks
 *   list-pages
 *   get-page <slug>
 *   create-page --title <t> [--slug <s>] [--blocks-file <file.json>] [--publish]
 *   update-page <slug> [--title <t>] [--blocks-file <file.json>] [--status draft|published|scheduled]
 *   publish-page <slug>            unpublish-page <slug>
 *   delete-page <slug>
 *   list-posts
 *   create-post --file <post.md> [--publish]     (markdown with YAML frontmatter)
 *   publish-post <slug>            delete-post <slug>
 *   list-categories
 *   create-category --name <n>
 *   set-redirect --from </old> --to </new> [--temporary]
 *   set-setting <key> <value>      (value parsed as JSON when possible)
 *   set-menu <header|footer> --file <items.json>
 *   create-api-key --name <n>
 *
 * Markdown frontmatter for create-post:
 *   title (required), slug, excerpt, category, tags (list), heroImageUrl,
 *   heroImageAlt, status, publishAt (ISO), metaTitle, metaDescription
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { createHash, randomBytes } from "crypto";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function fail(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

async function main() {
  const [, , command, positional] = process.argv;
  if (!command) fail("No command given. See the header of scripts/cms.ts for usage.");
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set. Add it to .env.local");

  const { db } = await import("../src/db");
  const { pages, posts, users, settings, menus, apiKeys, categories, redirects } = await import("../src/db/schema");
  const { validateBlocks } = await import("../src/blocks/registry");
  const { slugify } = await import("../src/lib/content");
  const { resolveCategoryId } = await import("../src/lib/categories");
  const { eq, desc } = await import("drizzle-orm");

  switch (command) {
    case "create-admin": {
      const email = arg("email") ?? fail("--email required");
      const password = arg("password") ?? fail("--password required");
      const name = arg("name") ?? email.split("@")[0];
      const bcrypt = (await import("bcryptjs")).default;
      const passwordHash = await bcrypt.hash(password, 10);
      await db
        .insert(users)
        .values({ email: email.toLowerCase(), name, passwordHash, role: "admin" })
        .onConflictDoUpdate({ target: users.email, set: { passwordHash, role: "admin" } });
      console.log(`Admin ready: ${email}`);
      break;
    }

    case "list-blocks": {
      const { blockList } = await import("../src/blocks/registry");
      for (const def of blockList) {
        console.log(`${def.type.padEnd(16)} ${def.description}`);
        console.log(`  defaults: ${JSON.stringify(def.defaults)}`);
      }
      break;
    }

    case "list-pages": {
      const rows = await db.select().from(pages).orderBy(desc(pages.updatedAt));
      for (const p of rows) console.log(`${p.status.padEnd(10)} /${p.slug.padEnd(28)} ${p.title}`);
      if (!rows.length) console.log("No pages.");
      break;
    }

    case "get-page": {
      if (!positional) fail("Usage: get-page <slug>");
      const [page] = await db.select().from(pages).where(eq(pages.slug, positional)).limit(1);
      if (!page) fail(`No page with slug "${positional}"`);
      console.log(JSON.stringify(page, null, 2));
      break;
    }

    case "create-page": {
      const title = arg("title") ?? fail("--title required");
      const slug = slugify(arg("slug") || title);
      const blocksFile = arg("blocks-file");
      const blocks = blocksFile ? JSON.parse(readFileSync(blocksFile, "utf8")) : [];
      validateBlocks(blocks);
      const publish = hasFlag("publish");
      const [page] = await db
        .insert(pages)
        .values({
          title,
          slug,
          blocks,
          status: publish ? "published" : "draft",
          publishedAt: publish ? new Date() : null,
        })
        .returning();
      console.log(`Created ${page.status} page /${page.slug}`);
      break;
    }

    case "update-page": {
      if (!positional) fail("Usage: update-page <slug> [--title] [--blocks-file] [--status]");
      const update: Record<string, unknown> = { updatedAt: new Date() };
      if (arg("title")) update.title = arg("title");
      if (arg("blocks-file")) {
        const blocks = JSON.parse(readFileSync(arg("blocks-file")!, "utf8"));
        validateBlocks(blocks);
        update.blocks = blocks;
      }
      if (arg("status")) {
        update.status = arg("status");
        if (arg("status") === "published") update.publishedAt = new Date();
      }
      const [page] = await db.update(pages).set(update).where(eq(pages.slug, positional)).returning();
      if (!page) fail(`No page with slug "${positional}"`);
      console.log(`Updated /${page.slug}`);
      break;
    }

    case "publish-page":
    case "unpublish-page": {
      if (!positional) fail(`Usage: ${command} <slug>`);
      const status = command === "publish-page" ? "published" : "draft";
      const [page] = await db
        .update(pages)
        .set({ status, updatedAt: new Date(), ...(status === "published" ? { publishedAt: new Date() } : {}) })
        .where(eq(pages.slug, positional))
        .returning();
      if (!page) fail(`No page with slug "${positional}"`);
      console.log(`/${page.slug} is now ${status}`);
      break;
    }

    case "delete-page": {
      if (!positional) fail("Usage: delete-page <slug>");
      const deleted = await db.delete(pages).where(eq(pages.slug, positional)).returning({ slug: pages.slug });
      if (!deleted.length) fail(`No page with slug "${positional}"`);
      console.log(`Deleted /${positional}`);
      break;
    }

    case "list-posts": {
      const rows = await db.select().from(posts).orderBy(desc(posts.updatedAt));
      for (const p of rows) console.log(`${p.status.padEnd(10)} /blog/${p.slug.padEnd(28)} ${p.title}`);
      if (!rows.length) console.log("No posts.");
      break;
    }

    case "create-post": {
      const file = arg("file") ?? fail("--file <post.md> required");
      const matter = (await import("gray-matter")).default;
      const { marked } = await import("marked");
      const { data, content } = matter(readFileSync(file, "utf8"));
      if (!data.title) fail("Frontmatter must include title");
      const body = await marked.parse(content);
      const slug = slugify(data.slug || data.title);
      const publish = hasFlag("publish") || data.status === "published";
      const [post] = await db
        .insert(posts)
        .values({
          title: data.title,
          slug,
          body,
          excerpt: data.excerpt ?? null,
          categoryId: await resolveCategoryId(data.category ?? null),
          tags: Array.isArray(data.tags) ? data.tags : [],
          heroImageUrl: data.heroImageUrl ?? null,
          heroImageAlt: data.heroImageAlt ?? null,
          status: publish ? "published" : (data.status ?? "draft"),
          publishAt: data.publishAt ? new Date(data.publishAt) : null,
          publishedAt: publish ? new Date() : null,
          metaTitle: data.metaTitle ?? null,
          metaDescription: data.metaDescription ?? null,
        })
        .returning();
      console.log(`Created ${post.status} post /blog/${post.slug}`);
      break;
    }

    case "publish-post": {
      if (!positional) fail("Usage: publish-post <slug>");
      const [post] = await db
        .update(posts)
        .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
        .where(eq(posts.slug, positional))
        .returning();
      if (!post) fail(`No post with slug "${positional}"`);
      console.log(`/blog/${post.slug} is now published`);
      break;
    }

    case "delete-post": {
      if (!positional) fail("Usage: delete-post <slug>");
      const deleted = await db.delete(posts).where(eq(posts.slug, positional)).returning({ slug: posts.slug });
      if (!deleted.length) fail(`No post with slug "${positional}"`);
      console.log(`Deleted /blog/${positional}`);
      break;
    }

    case "list-categories": {
      const rows = await db.select().from(categories).orderBy(categories.name);
      for (const c of rows) console.log(`${c.slug.padEnd(28)} ${c.name}`);
      if (!rows.length) console.log("No categories.");
      break;
    }

    case "create-category": {
      const name = arg("name") ?? fail("--name required");
      const id = await resolveCategoryId(name);
      console.log(`Category ready: ${name} (${id})`);
      break;
    }

    case "set-redirect": {
      const from = arg("from") ?? fail("--from required");
      const to = arg("to") ?? fail("--to required");
      const permanent = !hasFlag("temporary");
      const fromPath = from.startsWith("/") ? from : `/${from}`;
      await db
        .insert(redirects)
        .values({ fromPath, toPath: to, permanent })
        .onConflictDoUpdate({ target: redirects.fromPath, set: { toPath: to, permanent } });
      console.log(`Redirect: ${fromPath} -> ${to} (${permanent ? "301" : "302"})`);
      break;
    }

    case "set-setting": {
      const key = positional ?? fail("Usage: set-setting <key> <value>");
      const raw = process.argv[4];
      if (raw === undefined) fail("Usage: set-setting <key> <value>");
      let value: unknown = raw;
      try {
        value = JSON.parse(raw);
      } catch {
        /* keep as string */
      }
      await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
      console.log(`Set ${key}`);
      break;
    }

    case "set-menu": {
      const name = positional ?? fail("Usage: set-menu <header|footer> --file <items.json>");
      const file = arg("file") ?? fail("--file required");
      const items = JSON.parse(readFileSync(file, "utf8"));
      await db.insert(menus).values({ name, items }).onConflictDoUpdate({ target: menus.name, set: { items } });
      console.log(`Saved menu "${name}" (${items.length} items)`);
      break;
    }

    case "create-api-key": {
      const name = arg("name") ?? fail("--name required");
      const raw = `cms_${randomBytes(24).toString("hex")}`;
      const keyHash = createHash("sha256").update(raw).digest("hex");
      await db.insert(apiKeys).values({ name, keyHash });
      console.log(`API key created (store it now, it is not shown again):\n${raw}`);
      break;
    }

    default:
      fail(`Unknown command "${command}". See the header of scripts/cms.ts for usage.`);
  }
}

main().then(() => process.exit(0));
