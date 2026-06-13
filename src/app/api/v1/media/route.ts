import { listCloudinaryMedia } from "@/lib/cloudinary";
import { requireApiKey } from "@/lib/api-auth";

export async function GET(request: Request) {
  const denied = await requireApiKey(request);
  if (denied) return denied;
  const media = await listCloudinaryMedia();
  return Response.json({ media });
}
