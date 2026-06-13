import { desc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { UsersManager } from "@/components/admin/UsersManager";

export default async function UsersPage() {
  const me = await requireAdmin();
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt })
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <UsersManager
      meId={me.id}
      initial={rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
    />
  );
}
