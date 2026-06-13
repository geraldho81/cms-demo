import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export type CloudinaryCreds = { cloudName: string; apiKey: string; apiSecret: string };

/** Settings keys used when Cloudinary is configured inside the CMS (not via env). */
export const CLOUDINARY_KEYS = {
  cloudName: "cloudinaryCloudName",
  apiKey: "cloudinaryApiKey",
  apiSecret: "cloudinaryApiSecret",
} as const;

/**
 * Resolve Cloudinary credentials from environment variables first, then from
 * the credentials saved in the CMS settings. Returns null when neither is
 * complete, so callers can degrade gracefully instead of crashing.
 */
export async function getCloudinaryCreds(): Promise<CloudinaryCreds | null> {
  const envName = process.env.CLOUDINARY_CLOUD_NAME;
  const envKey = process.env.CLOUDINARY_API_KEY;
  const envSecret = process.env.CLOUDINARY_API_SECRET;
  if (envName && envKey && envSecret) {
    return { cloudName: envName, apiKey: envKey, apiSecret: envSecret };
  }

  try {
    const rows = await db.select().from(settings).where(inArray(settings.key, Object.values(CLOUDINARY_KEYS)));
    const map = Object.fromEntries(rows.map((r) => [r.key, typeof r.value === "string" ? r.value.trim() : ""]));
    const cloudName = map[CLOUDINARY_KEYS.cloudName] || "";
    const apiKey = map[CLOUDINARY_KEYS.apiKey] || "";
    const apiSecret = map[CLOUDINARY_KEYS.apiSecret] || "";
    if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };
  } catch {
    // DB not reachable - treat as unconfigured rather than throwing.
  }
  return null;
}

export async function isCloudinaryConfigured(): Promise<boolean> {
  return (await getCloudinaryCreds()) !== null;
}
