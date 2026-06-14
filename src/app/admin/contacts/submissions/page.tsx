import { desc } from "drizzle-orm";
import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { SubmissionsTable, type SubmissionRow } from "@/components/admin/SubmissionsTable";

export default async function SubmissionsPage() {
  const rows = await db
    .select()
    .from(contactSubmissions)
    .orderBy(desc(contactSubmissions.createdAt))
    .limit(500);

  const data: SubmissionRow[] = rows.map((r) => ({
    id: r.id,
    formName: r.formName,
    data: r.data,
    createdAt: r.createdAt.toISOString(),
  }));

  return <SubmissionsTable initial={data} />;
}
