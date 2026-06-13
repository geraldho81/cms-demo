import Link from "next/link";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { pages, posts, media, contactSubmissions } from "@/db/schema";
import { formatDate } from "@/lib/content";
import { NewPageButton, NewPostButton } from "@/components/admin/NewContentButtons";

export default async function Dashboard() {
  const [
    [pageCount],
    [postCount],
    [mediaCount],
    [draftCount],
    [scheduledCount],
    recentDrafts,
    recentSubmissions,
  ] = await Promise.all([
    db.select({ n: count() }).from(pages).where(isNull(pages.deletedAt)),
    db.select({ n: count() }).from(posts).where(isNull(posts.deletedAt)),
    db.select({ n: count() }).from(media),
    db.select({ n: count() }).from(posts).where(and(isNull(posts.deletedAt), eq(posts.status, "draft"))),
    db.select({ n: count() }).from(posts).where(and(isNull(posts.deletedAt), eq(posts.status, "scheduled"))),
    db
      .select({ id: posts.id, title: posts.title, updatedAt: posts.updatedAt })
      .from(posts)
      .where(and(isNull(posts.deletedAt), eq(posts.status, "draft")))
      .orderBy(desc(posts.updatedAt))
      .limit(5),
    db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt)).limit(5),
  ]);

  const stats = [
    { label: "Pages", value: pageCount.n, href: "/admin/pages" },
    { label: "Posts", value: postCount.n, href: "/admin/posts" },
    { label: "Drafts", value: draftCount.n, href: "/admin/posts?view=draft" },
    { label: "Scheduled", value: scheduledCount.n, href: "/admin/posts?view=scheduled" },
    { label: "Media items", value: mediaCount.n, href: "/admin/media" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          <NewPageButton />
          <NewPostButton />
        </div>
      </div>

      <div className="mb-10 grid grid-cols-5 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl bg-white p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <div className="text-3xl font-bold tracking-tight">{s.value}</div>
            <div className="text-sm" style={{ color: "var(--ad-muted)" }}>{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section className="rounded-xl bg-white p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: "var(--ad-muted)" }}>
            Drafts in progress
          </h2>
          {recentDrafts.length === 0 && <p className="text-sm" style={{ color: "var(--ad-muted)" }}>No drafts. You are all caught up.</p>}
          {recentDrafts.map((p) => (
            <Link key={p.id} href={`/admin/posts/${p.id}`} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-[var(--ad-bg)]">
              <span className="truncate font-medium">{p.title}</span>
              <span className="ml-3 shrink-0 text-xs" style={{ color: "var(--ad-muted)" }}>{formatDate(p.updatedAt)}</span>
            </Link>
          ))}
        </section>
        <section className="rounded-xl bg-white p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: "var(--ad-muted)" }}>
            Recent contact submissions
          </h2>
          {recentSubmissions.length === 0 && <p className="text-sm" style={{ color: "var(--ad-muted)" }}>No submissions yet.</p>}
          {recentSubmissions.map((s) => (
            <div key={s.id} className="rounded-lg px-2 py-2">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium">{s.name}</span>
                <span className="ml-3 shrink-0 text-xs" style={{ color: "var(--ad-muted)" }}>{formatDate(s.createdAt)}</span>
              </div>
              <a href={`mailto:${s.email}`} className="text-xs hover:underline" style={{ color: "var(--ad-accent)" }}>
                {s.email}
              </a>
              {s.message && <p className="mt-0.5 truncate text-xs" style={{ color: "var(--ad-muted)" }}>{s.message}</p>}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
