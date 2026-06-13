import { desc } from "drizzle-orm";
import { db } from "@/db";
import { redirects } from "@/db/schema";
import { RedirectsManager } from "@/components/admin/RedirectsManager";

export default async function RedirectsPage() {
  const rows = await db.select().from(redirects).orderBy(desc(redirects.createdAt));
  return <RedirectsManager initial={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />;
}
