import { desc } from "drizzle-orm";
import { db } from "@/db";
import { mediaTrash } from "@/db/schema";
import { MediaTrash } from "@/components/admin/MediaTrash";

export const dynamic = "force-dynamic";

export default async function MediaTrashPage() {
  const rows = await db.select().from(mediaTrash).orderBy(desc(mediaTrash.trashedAt));
  const ttlDays = Number(process.env.MEDIA_TRASH_TTL_DAYS) || 30;
  const items = rows.map((r) => ({
    publicId: r.publicId,
    resourceType: r.resourceType,
    url: r.url,
    name: r.name,
    mimeType: r.mimeType,
    alt: r.alt,
    trashedAt: r.trashedAt.toISOString(),
  }));
  return <MediaTrash items={items} ttlDays={ttlDays} />;
}
