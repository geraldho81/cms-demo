import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/queries";

export function bumpPagesCache() {
  revalidateTag(CACHE_TAGS.pages, "max");
  revalidatePath("/", "layout");
}

export function bumpPostsCache() {
  revalidateTag(CACHE_TAGS.posts, "max");
  revalidatePath("/blog", "layout");
}

export function bumpSettingsCache() {
  revalidateTag(CACHE_TAGS.settings, "max");
  revalidateTag(CACHE_TAGS.menus, "max");
  revalidatePath("/", "layout");
}
