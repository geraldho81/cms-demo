import { db } from "@/db";
import { menus, pages } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { MenusEditor } from "@/components/admin/MenusEditor";

export default async function MenusPage() {
  const [allMenus, livePages] = await Promise.all([
    db.select().from(menus),
    db.select({ slug: pages.slug, title: pages.title }).from(pages).where(inArray(pages.status, ["published", "scheduled"])),
  ]);
  const byName = Object.fromEntries(allMenus.map((m) => [m.name, m.items]));

  return (
    <MenusEditor
      header={byName.header ?? []}
      footer={byName.footer ?? []}
      pageOptions={livePages.map((p) => ({ label: p.title, href: p.slug === "home" ? "/" : `/${p.slug}` }))}
    />
  );
}
