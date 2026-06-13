import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";

/**
 * Validates the Authorization: Bearer <key> header against hashed API keys.
 * Returns null when valid, or a 401 Response to return as-is.
 */
export async function requireApiKey(request: Request): Promise<Response | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return Response.json({ error: "Missing Authorization: Bearer <api key> header" }, { status: 401 });
  }
  const keyHash = createHash("sha256").update(match[1].trim()).digest("hex");
  const [row] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);
  if (!row) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }
  // Fire and forget - never block the request on this
  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id)).catch(() => {});
  return null;
}

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}
