import { listCloudinaryMedia, isCloudinaryConfigured } from "@/lib/cloudinary";
import { requireApiKey } from "@/lib/api-auth";

export async function GET(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  if (!(await isCloudinaryConfigured())) {
    return Response.json({ media: [], error: "Cloudinary is not connected." });
  }
  const media = await listCloudinaryMedia().catch(() => []);
  return Response.json({ media });
}
