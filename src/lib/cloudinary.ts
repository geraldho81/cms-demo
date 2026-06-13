import "server-only";

/**
 * Server-side Cloudinary Admin API client. The media library reads directly
 * from Cloudinary so anything on the instance (uploaded via the CMS or a CLI
 * agent) shows up, and deleting in the library removes it from Cloudinary.
 */

export type CloudinaryItem = {
  id: string; // public_id (unique)
  resourceType: string; // image | raw | video
  url: string;
  name: string;
  mimeType: string;
  size: number | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: string;
};

type Resource = {
  public_id: string;
  resource_type: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  secure_url: string;
  display_name?: string;
  created_at: string;
  context?: { custom?: { alt?: string } };
};

function config() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).");
  }
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  return { cloudName, auth, base: `https://api.cloudinary.com/v1_1/${cloudName}` };
}

function mimeType(r: Resource): string {
  const fmt = (r.format ?? "").toLowerCase();
  if (fmt === "pdf") return "application/pdf";
  if (fmt === "svg") return "image/svg+xml";
  if (r.resource_type === "image" && fmt) return `image/${fmt}`;
  if (fmt) return `${r.resource_type}/${fmt}`;
  return r.resource_type;
}

function toItem(r: Resource): CloudinaryItem {
  return {
    id: r.public_id,
    resourceType: r.resource_type,
    url: r.secure_url,
    name: r.display_name || `${r.public_id.split("/").pop()}${r.format ? "." + r.format : ""}`,
    mimeType: mimeType(r),
    size: r.bytes ?? null,
    width: r.width ?? null,
    height: r.height ?? null,
    alt: r.context?.custom?.alt ?? null,
    createdAt: r.created_at,
  };
}

async function listType(resourceType: "image" | "raw" | "video"): Promise<Resource[]> {
  const { base, auth } = config();
  const out: Resource[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(`${base}/resources/${resourceType}`);
    url.searchParams.set("max_results", "500");
    url.searchParams.set("context", "true");
    if (cursor) url.searchParams.set("next_cursor", cursor);
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404) break; // no resources of this type
      throw new Error(`Cloudinary list failed (${res.status}): ${(await res.text()).slice(0, 160)}`);
    }
    const data = (await res.json()) as { resources?: Resource[]; next_cursor?: string };
    out.push(...(data.resources ?? []));
    cursor = data.next_cursor;
  } while (cursor);
  return out;
}

export async function listCloudinaryMedia(): Promise<CloudinaryItem[]> {
  const [images, raw] = await Promise.all([listType("image"), listType("raw")]);
  return [...images, ...raw]
    .map(toItem)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function deleteCloudinaryMedia(publicId: string, resourceType = "image"): Promise<void> {
  const { base, auth } = config();
  const url = new URL(`${base}/resources/${resourceType}/upload`);
  url.searchParams.append("public_ids[]", publicId);
  const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`Cloudinary delete failed (${res.status}): ${(await res.text()).slice(0, 160)}`);
}

export async function setCloudinaryAlt(publicId: string, alt: string, resourceType = "image"): Promise<void> {
  const { base, auth } = config();
  const res = await fetch(`${base}/resources/${resourceType}/upload/${publicId}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ context: `alt=${alt}` }),
  });
  if (!res.ok) throw new Error(`Cloudinary update failed (${res.status}): ${(await res.text()).slice(0, 160)}`);
}
