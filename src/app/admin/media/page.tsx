import { listCloudinaryMedia } from "@/lib/cloudinary";
import { db } from "@/db";
import { mediaTrash } from "@/db/schema";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const [items, trashed] = await Promise.all([
    listCloudinaryMedia(),
    db.select({ publicId: mediaTrash.publicId }).from(mediaTrash),
  ]);
  const trashedIds = new Set(trashed.map((t) => t.publicId));
  const live = items.filter((m) => !trashedIds.has(m.id));
  return <MediaLibrary initial={live} trashCount={trashedIds.size} />;
}
